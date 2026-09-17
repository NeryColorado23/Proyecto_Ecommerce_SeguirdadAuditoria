export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: ImportRowError[];
}

export interface ImportBatch {
  id: string;
  file_name: string;
  row_count: number;
  success_count: number;
  error_count: number;
  status: 'completed' | 'completed_with_errors' | 'failed';
  created_at: string;
  moduleLabel?: string;
}
