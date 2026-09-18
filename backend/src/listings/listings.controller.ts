import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service.js';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ColumnSpec, buildTemplateWorkbook, parseWorkbook } from '../common/excel.util.js';
import { sanitizeText } from '../common/sanitize.util.js';
import { ImportBatchesService, RowError } from '../imports/import-batches.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';

const COLUMNS: ColumnSpec[] = [
  { header: 'ASIN', key: 'asin', width: 15, example: 'B000000000' },
  { header: 'Título', key: 'title', width: 40, example: 'Ejemplo de título del producto' },
  { header: 'Bullet 1', key: 'bullet_1', width: 40 },
  { header: 'Bullet 2', key: 'bullet_2', width: 40 },
  { header: 'Bullet 3', key: 'bullet_3', width: 40 },
  { header: 'Bullet 4', key: 'bullet_4', width: 40 },
  { header: 'Bullet 5', key: 'bullet_5', width: 40 },
  { header: 'Descripción', key: 'description', width: 50 },
  { header: 'Imágenes (URLs separadas por coma)', key: 'images', width: 50 },
];

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly importBatches: ImportBatchesService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase.client
      .from('listings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  @Get('template')
  async downloadTemplate(): Promise<{ fileName: string; base64: string }> {
    const buffer = await buildTemplateWorkbook('Listings', COLUMNS);
    return { fileName: 'plantilla-listings.xlsx', base64: buffer.toString('base64') };
  }

  @Get('imports')
  listImports() {
    return this.importBatches.listForModule('listings');
  }

  @Get(':id')
  async getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const { data, error } = await this.supabase.client
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Listing no encontrado');
    }

    return data;
  }

  @Post()
  async create(
    @Body() dto: CreateListingDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    const { data, error } = await this.supabase.client
      .from('listings')
      .insert({ ...this.sanitizeListingText(dto), images: dto.images ?? [] })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.auditLog.record({
      userId: request.user.id,
      action: 'listing_created',
      entityType: 'listing',
      entityId: dto.asin,
      ipAddress: AuditLogService.extractIp(request),
    });

    return data;
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateListingDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    const { data, error } = await this.supabase.client
      .from('listings')
      .update(this.sanitizeListingText(dto))
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Listing no encontrado');
    }

    await this.auditLog.record({
      userId: request.user.id,
      action: 'listing_updated',
      entityType: 'listing',
      entityId: data['asin'],
      ipAddress: AuditLogService.extractIp(request),
    });

    return data;
  }

  @Roles('admin')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const rows = await parseWorkbook(file.buffer, COLUMNS);
    const errors: RowError[] = [];
    const validRows: Record<string, unknown>[] = [];

    for (const row of rows) {
      const asin = row.values['asin'];
      if (!asin || typeof asin !== 'string') {
        errors.push({ row: row.rowNumber, message: 'ASIN es requerido' });
        continue;
      }

      const images = row.values['images'];
      validRows.push({
        asin: asin.trim(),
        title: row.values['title'] || null,
        bullet_1: row.values['bullet_1'] || null,
        bullet_2: row.values['bullet_2'] || null,
        bullet_3: row.values['bullet_3'] || null,
        bullet_4: row.values['bullet_4'] || null,
        bullet_5: row.values['bullet_5'] || null,
        description: row.values['description'] || null,
        images:
          typeof images === 'string'
            ? images
                .split(',')
                .map((url) => url.trim())
                .filter(Boolean)
            : [],
      });
    }

    if (validRows.length > 0) {
      const { error } = await this.supabase.client
        .from('listings')
        .upsert(validRows, { onConflict: 'asin' });

      if (error) {
        for (const row of validRows) {
          errors.push({ row: 0, message: `Error al guardar ASIN ${row['asin']}: ${error.message}` });
        }
        validRows.length = 0;
      }
    }

    await this.importBatches.record('listings', {
      fileName: file.originalname,
      uploadedBy: request.user.id,
      ipAddress: AuditLogService.extractIp(request),
      rowCount: rows.length,
      successCount: validRows.length,
      errorCount: errors.length,
      errors,
    });

    return {
      rowCount: rows.length,
      successCount: validRows.length,
      errorCount: errors.length,
      errors,
    };
  }

  // Mismo anti-inyección de fórmulas que aplica la carga por Excel (ver
  // common/sanitize.util.ts), pero para el texto escrito a mano en el
  // Listing Builder: ambos caminos terminan en la misma tabla.
  private sanitizeListingText<T extends Partial<CreateListingDto>>(dto: T): T {
    const sanitized = { ...dto };
    const textFields = [
      'title',
      'bullet_1',
      'bullet_2',
      'bullet_3',
      'bullet_4',
      'bullet_5',
      'description',
    ] as const;

    for (const field of textFields) {
      const value = sanitized[field];
      if (typeof value === 'string') {
        sanitized[field] = sanitizeText(value) as T[typeof field];
      }
    }

    return sanitized;
  }
}
