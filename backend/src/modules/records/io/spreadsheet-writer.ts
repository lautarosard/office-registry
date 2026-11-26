import { Readable } from 'stream';
import writeXlsxFile, { type SheetData } from 'write-excel-file/node';

/** A `Date` becomes a real date cell, shown as dd/mm/yyyy. */
export type OutputCell = string | Date | null;

export interface Column {
  header: string;
  width: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayText = (d: Date) =>
  `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

/**
 * Excel runs a CSV cell starting with these as a formula. An apostrophe makes
 * it plain text. (XLSX cells are typed as text, so they need no escaping.)
 */
export const neutralizeFormula = (value: string) =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

const csvCell = (cell: OutputCell) => {
  if (cell === null) return '';
  const text = cell instanceof Date ? dayText(cell) : neutralizeFormula(cell);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// ";" and a BOM: what Excel with Argentine regional settings opens correctly.
function csvStream(columns: Column[], rows: OutputCell[][]): Readable {
  function* lines() {
    yield `\uFEFF${columns.map((c) => csvCell(c.header)).join(';')}\r\n`;
    for (const row of rows) yield `${row.map(csvCell).join(';')}\r\n`;
  }
  return Readable.from(lines(), { objectMode: false });
}

function xlsxStream(columns: Column[], rows: OutputCell[][]) {
  const data: SheetData = [
    columns.map((c) => ({
      value: c.header,
      type: String,
      fontWeight: 'bold' as const,
    })),
    ...rows.map((row) =>
      row.map((cell) => {
        if (cell === null) return null;
        return cell instanceof Date
          ? { value: cell, type: Date, format: 'dd/mm/yyyy' }
          : { value: cell, type: String };
      }),
    ),
  ];

  return writeXlsxFile(data, {
    sheet: 'Expedientes',
    columns: columns.map(({ width }) => ({ width })),
    stickyRowsCount: 1,
  }).toStream as () => Promise<Readable>;
}

export const CONTENT_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

export async function spreadsheetStream(
  format: keyof typeof CONTENT_TYPES,
  columns: Column[],
  rows: OutputCell[][],
): Promise<Readable> {
  return format === 'csv'
    ? csvStream(columns, rows)
    : xlsxStream(columns, rows)();
}
