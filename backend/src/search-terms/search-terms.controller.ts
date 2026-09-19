import {
  BadRequestException,
  Controller,
  Get,
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
import { ModuleAccessGuard } from '../auth/module-access.guard.js';
import { RequireModule } from '../auth/module-access.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ColumnSpec, buildTemplateWorkbook, parseWorkbook } from '../common/excel.util.js';
import { ImportBatchesService, RowError } from '../imports/import-batches.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const COLUMNS: ColumnSpec[] = [
  { header: 'ASIN', key: 'asin', width: 15, example: 'B000000000' },
  { header: 'Término de búsqueda', key: 'search_term', width: 40, example: 'ejemplo termino busqueda' },
  { header: 'Volumen de búsqueda', key: 'search_volume', width: 20, example: 1000 },
];

@UseGuards(SupabaseAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller('search-terms')
export class SearchTermsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly importBatches: ImportBatchesService,
  ) {}

  @RequireModule('search_terms')
  @Get()
  async list() {
    const { data, error } = await this.supabase.client
      .from('search_terms')
      .select('*')
      .order('search_volume', { ascending: false, nullsFirst: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  @RequireModule('search_terms', 'editor')
  @Get('template')
  async downloadTemplate(): Promise<{ fileName: string; base64: string }> {
    const buffer = await buildTemplateWorkbook('Search Terms', COLUMNS);
    return { fileName: 'plantilla-search-terms.xlsx', base64: buffer.toString('base64') };
  }

  @RequireModule('search_terms')
  @Get('imports')
  listImports() {
    return this.importBatches.listForModule('search_terms');
  }

  @RequireModule('search_terms', 'editor')
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
      const searchTerm = row.values['search_term'];

      if (!asin || typeof asin !== 'string') {
        errors.push({ row: row.rowNumber, message: 'ASIN es requerido' });
        continue;
      }
      if (!searchTerm || typeof searchTerm !== 'string') {
        errors.push({ row: row.rowNumber, message: 'Término de búsqueda es requerido' });
        continue;
      }

      const volume = row.values['search_volume'];
      validRows.push({
        asin: asin.trim(),
        search_term: searchTerm.trim(),
        search_volume: typeof volume === 'number' ? volume : null,
      });
    }

    if (validRows.length > 0) {
      const { error } = await this.supabase.client
        .from('search_terms')
        .upsert(validRows, { onConflict: 'asin,search_term' });

      if (error) {
        for (const row of validRows) {
          errors.push({
            row: 0,
            message: `Error al guardar "${row['search_term']}": ${error.message}`,
          });
        }
        validRows.length = 0;
      }
    }

    await this.importBatches.record('search_terms', {
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
}
