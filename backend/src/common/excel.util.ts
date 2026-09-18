import ExcelJS from 'exceljs';
import { sanitizeText } from './sanitize.util.js';

export interface ColumnSpec {
  header: string;
  key: string;
  width?: number;
  example?: string | number;
}

export async function buildTemplateWorkbook(
  sheetName: string,
  columns: ColumnSpec[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 20,
  }));
  sheet.getRow(1).font = { bold: true };

  if (columns.some((column) => column.example !== undefined)) {
    sheet.addRow(Object.fromEntries(columns.map((column) => [column.key, column.example ?? ''])));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface ParsedRow {
  rowNumber: number;
  values: Record<string, string | number | null>;
}

function cellValueToText(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '';
  }

  if (typeof raw === 'object') {
    const obj = raw as {
      text?: string;
      formula?: string;
      result?: unknown;
      richText?: { text: string }[];
    };

    if (Array.isArray(obj.richText)) {
      return obj.richText.map((part) => part.text).join('');
    }
    if (obj.formula !== undefined) {
      // El archivo traía una fórmula: se usa el último valor calculado
      // (nunca la fórmula en sí) y de todas formas se sanitiza abajo.
      return obj.result !== null && obj.result !== undefined ? String(obj.result) : '';
    }
    return String(obj.text ?? '');
  }

  return String(raw);
}

export async function parseWorkbook(
  buffer: Buffer,
  columns: ColumnSpec[],
): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return [];
  }

  const headerRow = sheet.getRow(1).values as unknown[];
  const columnIndexByKey = new Map<string, number>();
  for (const column of columns) {
    const index = headerRow.findIndex(
      (value) => typeof value === 'string' && value.trim() === column.header,
    );
    if (index > 0) {
      columnIndexByKey.set(column.key, index);
    }
  }

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values: Record<string, string | number | null> = {};
    let hasData = false;

    for (const column of columns) {
      const index = columnIndexByKey.get(column.key);
      const cell = index ? row.getCell(index) : undefined;
      const raw = cell?.value;

      let value: string | number | null = null;
      if (typeof raw === 'number') {
        value = raw;
      } else if (raw instanceof Date) {
        value = raw.toISOString().slice(0, 10);
      } else if (raw !== null && raw !== undefined) {
        const text = cellValueToText(raw).trim();
        value = text.length > 0 ? sanitizeText(text) : null;
      }

      if (value !== null && value !== '') {
        hasData = true;
      }
      values[column.key] = value;
    }

    if (hasData) {
      rows.push({ rowNumber, values });
    }
  });

  return rows;
}
