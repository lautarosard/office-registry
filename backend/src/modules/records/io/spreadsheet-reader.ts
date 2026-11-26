import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';

export type InputCell = string | number | boolean | Date | null;

/** Excel on an Argentine PC often saves CSV as Windows-1252, not UTF-8. */
function decodeText(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** The delimiter that appears most in the header line. */
function detectDelimiter(text: string): string {
  const header = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const count = (d: string) => header.split(d).length - 1;
  return [';', ',', '\t'].sort((a, b) => count(b) - count(a))[0];
}

function readCsv(buffer: Buffer): InputCell[][] {
  const text = decodeText(buffer);
  return parse(text, {
    bom: true,
    delimiter: detectDelimiter(text),
    relax_column_count: true,
    // Keep empty lines, so reported row numbers match the spreadsheet.
    skip_empty_lines: false,
  });
}

/**
 * Rows of the first sheet (XLSX) or of the file (CSV). Row 0 of the result is
 * spreadsheet row 1.
 */
export async function readSpreadsheet(
  fileName: string,
  buffer: Buffer,
): Promise<InputCell[][]> {
  const extension = fileName.toLowerCase().split('.').pop();

  if (extension !== 'xlsx' && extension !== 'csv') {
    throw new BadRequestException(
      'Formato no admitido. Guarde la planilla como .xlsx o .csv.',
    );
  }

  try {
    return extension === 'csv' ? readCsv(buffer) : await readSheet(buffer);
  } catch {
    throw new BadRequestException(
      'No se pudo leer el archivo. Verifique que no esté dañado.',
    );
  }
}
