import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export type ImportModule = 'listings' | 'search_terms' | 'ppc';

export interface RowError {
  row: number;
  message: string;
}

export interface ImportOutcome {
  fileName: string;
  uploadedBy: string;
  ipAddress?: string | null;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: RowError[];
}

@Injectable()
export class ImportBatchesService {
  constructor(private readonly supabase: SupabaseService) {}

  async record(module: ImportModule, outcome: ImportOutcome): Promise<void> {
    const status =
      outcome.errorCount === 0
        ? 'completed'
        : outcome.successCount === 0
          ? 'failed'
          : 'completed_with_errors';

    await this.supabase.client.from('import_batches').insert({
      module,
      file_name: outcome.fileName,
      uploaded_by: outcome.uploadedBy,
      ip_address: outcome.ipAddress ?? null,
      row_count: outcome.rowCount,
      success_count: outcome.successCount,
      error_count: outcome.errorCount,
      status,
      errors: outcome.errors.length > 0 ? outcome.errors : null,
    });
  }

  async listForModule(module: ImportModule) {
    const { data, error } = await this.supabase.client
      .from('import_batches')
      .select('id, file_name, row_count, success_count, error_count, status, errors, created_at')
      .eq('module', module)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return data;
  }
}
