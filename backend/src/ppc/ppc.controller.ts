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
  { header: 'Campaña', key: 'campaign_name', width: 30, example: 'Campaña ejemplo' },
  { header: 'Grupo de anuncios', key: 'ad_group_name', width: 30, example: 'Ad group ejemplo' },
  { header: 'Targeting', key: 'targeting', width: 30, example: 'palabra clave o ASIN' },
  { header: 'Tipo de concordancia', key: 'match_type', width: 18, example: 'exact' },
  { header: 'Fecha (AAAA-MM-DD)', key: 'report_date', width: 18, example: '2026-01-01' },
  { header: 'Impresiones', key: 'impressions', width: 14, example: 1000 },
  { header: 'Clics', key: 'clicks', width: 10, example: 50 },
  { header: 'Inversión', key: 'spend', width: 12, example: 25.5 },
  { header: 'Ventas', key: 'sales', width: 12, example: 100 },
  { header: 'Pedidos', key: 'orders', width: 10, example: 5 },
];

@UseGuards(SupabaseAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller('ppc')
export class PpcController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly importBatches: ImportBatchesService,
  ) {}

  @RequireModule('ppc')
  @Get()
  async list() {
    const { data, error } = await this.supabase.client
      .from('ppc_reports')
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  @RequireModule('ppc', 'editor')
  @Get('template')
  async downloadTemplate(): Promise<{ fileName: string; base64: string }> {
    const buffer = await buildTemplateWorkbook('PPC', COLUMNS);
    return { fileName: 'plantilla-ppc.xlsx', base64: buffer.toString('base64') };
  }

  @RequireModule('ppc')
  @Get('imports')
  listImports() {
    return this.importBatches.listForModule('ppc');
  }

  @RequireModule('ppc', 'editor')
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

    const requiredText = ['campaign_name', 'ad_group_name', 'targeting', 'match_type'] as const;

    for (const row of rows) {
      const missing = requiredText.find((key) => !row.values[key]);
      if (missing || !row.values['report_date']) {
        errors.push({
          row: row.rowNumber,
          message: 'Campaña, grupo de anuncios, targeting, tipo de concordancia y fecha son requeridos',
        });
        continue;
      }

      const toNumber = (value: string | number | null): number =>
        typeof value === 'number' ? value : Number(value) || 0;

      validRows.push({
        campaign_name: String(row.values['campaign_name']).trim(),
        ad_group_name: String(row.values['ad_group_name']).trim(),
        targeting: String(row.values['targeting']).trim(),
        match_type: String(row.values['match_type']).trim(),
        report_date: row.values['report_date'],
        impressions: toNumber(row.values['impressions']),
        clicks: toNumber(row.values['clicks']),
        spend: toNumber(row.values['spend']),
        sales: toNumber(row.values['sales']),
        orders: toNumber(row.values['orders']),
      });
    }

    if (validRows.length > 0) {
      const { error } = await this.supabase.client
        .from('ppc_reports')
        .upsert(validRows, { onConflict: 'campaign_name,ad_group_name,targeting,match_type,report_date' });

      if (error) {
        for (const row of validRows) {
          errors.push({
            row: 0,
            message: `Error al guardar "${row['campaign_name']}": ${error.message}`,
          });
        }
        validRows.length = 0;
      }
    }

    await this.importBatches.record('ppc', {
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
