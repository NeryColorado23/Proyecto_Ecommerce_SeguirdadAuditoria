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
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ColumnSpec, buildTemplateWorkbook, parseWorkbook } from '../common/excel.util.js';
import { ImportBatchesService, RowError } from '../imports/import-batches.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const COLUMNS: ColumnSpec[] = [
  { header: 'ASIN', key: 'asin', width: 15, example: 'B000000000' },
  { header: 'Keyword', key: 'keyword', width: 30, example: 'ejemplo keyword objetivo' },
  { header: 'Volumen de búsqueda', key: 'search_volume', width: 20, example: 1000 },
  { header: 'Ranking orgánico', key: 'organic_rank', width: 18, example: 12 },
  { header: 'Indexado (si/no)', key: 'indexed', width: 16, example: 'si' },
];

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('keywords')
export class KeywordsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly importBatches: ImportBatchesService,
  ) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase.client
      .from('keywords')
      .select('*')
      .order('organic_rank', { ascending: true, nullsFirst: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  @Get('template')
  async downloadTemplate(): Promise<{ fileName: string; base64: string }> {
    const buffer = await buildTemplateWorkbook('Keywords', COLUMNS);
    return { fileName: 'plantilla-keywords.xlsx', base64: buffer.toString('base64') };
  }

  @Get('imports')
  listImports() {
    return this.importBatches.listForModule('keywords');
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
      const keyword = row.values['keyword'];

      if (!asin || typeof asin !== 'string') {
        errors.push({ row: row.rowNumber, message: 'ASIN es requerido' });
        continue;
      }
      if (!keyword || typeof keyword !== 'string') {
        errors.push({ row: row.rowNumber, message: 'Keyword es requerido' });
        continue;
      }

      const volume = row.values['search_volume'];
      const rank = row.values['organic_rank'];
      const indexedRaw = row.values['indexed'];
      const indexed =
        typeof indexedRaw === 'string' ? !['no', 'false', '0'].includes(indexedRaw.toLowerCase()) : true;

      validRows.push({
        asin: asin.trim(),
        keyword: keyword.trim(),
        search_volume: typeof volume === 'number' ? volume : null,
        organic_rank: typeof rank === 'number' ? rank : null,
        indexed,
      });
    }

    if (validRows.length > 0) {
      const { error } = await this.supabase.client
        .from('keywords')
        .upsert(validRows, { onConflict: 'asin,keyword' });

      if (error) {
        for (const row of validRows) {
          errors.push({
            row: 0,
            message: `Error al guardar "${row['keyword']}": ${error.message}`,
          });
        }
        validRows.length = 0;
      }
    }

    await this.importBatches.record('keywords', {
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
