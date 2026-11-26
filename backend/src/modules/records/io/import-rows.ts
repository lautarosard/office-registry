import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { CreateRecordDto } from '../dto/create-record.dto';
import { IMPORT_COLUMNS, type ImportField } from './columns';
import type { InputCell } from './spreadsheet-reader';

export const MAX_IMPORT_ROWS = 20_000;

export interface RowError {
  /** Row number as the spreadsheet shows it. */
  row: number;
  field: ImportField;
  message: string;
}

export interface ParsedImport {
  totalRows: number;
  valid: CreateRecordDto[];
  errors: RowError[];
}

/** "  REPARTICIÓN " -> "reparticion" */
const headerKey = (value: InputCell) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const isBlank = (row: InputCell[]) =>
  row.every((cell) => cell === null || String(cell).trim() === '');

function locateColumns(header: InputCell[]): Map<ImportField, number> {
  const keys = header.map(headerKey);
  const columns = new Map<ImportField, number>();
  const missing: string[] = [];

  for (const column of IMPORT_COLUMNS) {
    const key = headerKey(column.header);
    const index = keys.indexOf(key);
    if (index !== keys.lastIndexOf(key)) {
      throw new BadRequestException(
        `La columna "${column.header}" está repetida.`,
      );
    }
    if (index >= 0) columns.set(column.field, index);
    else if (column.required) missing.push(column.header);
  }

  if (missing.length) {
    throw new BadRequestException(
      `Faltan columnas en la planilla: ${missing.join(', ')}.`,
    );
  }
  return columns;
}

// Excel counts days from 1899-12-30. Only years 2000-2100 are believable here.
const SERIAL_EPOCH = Date.UTC(1899, 11, 30);
const SERIAL_RANGE = { min: 36526, max: 73415 };

/**
 * Accepts a date cell, an Excel serial number, dd/mm/yyyy or yyyy-mm-dd.
 * Anything else is returned unchanged for the validator to reject.
 */
export function toDayString(cell: InputCell): string {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (
    typeof cell === 'number' &&
    cell >= SERIAL_RANGE.min &&
    cell <= SERIAL_RANGE.max
  ) {
    return new Date(SERIAL_EPOCH + Math.floor(cell) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }

  const text = String(cell ?? '').trim();
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!local) return text;
  const [, day, month, year] = local;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

const toText = (cell: InputCell): string => {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  // Postgres can't store NUL characters.
  return String(cell ?? '').replaceAll('\u0000', '');
};

/** The spreadsheet shows "no pase" as dashes, like the app's table. */
const toForwarding = (cell: InputCell) => {
  const text = toText(cell).trim();
  return /^-*$/.test(text) ? null : text;
};

/** Undoes the apostrophe the CSV export puts before formula-like text. */
const unquoteFormula = (cell: InputCell): InputCell =>
  typeof cell === 'string' ? cell.replace(/^'(?=[=+\-@\t\r])/, '') : cell;

function toErrors(row: number, errors: ValidationError[]): RowError[] {
  return errors.map(({ property, constraints = {} }) => ({
    row,
    field: property as ImportField,
    // One message per field, the most basic problem first.
    message:
      constraints.isNotEmpty ??
      constraints.isString ??
      Object.values(constraints)[0],
  }));
}

/**
 * Applies to every row exactly the rules of the "Nuevo registro" API, by
 * validating it as a CreateRecordDto.
 */
export async function parseImportRows(
  rows: InputCell[][],
): Promise<ParsedImport> {
  const headerIndex = rows.findIndex((row) => !isBlank(row));
  if (headerIndex < 0) {
    throw new BadRequestException('La planilla está vacía.');
  }
  const columns = locateColumns(rows[headerIndex]);

  const dataRows = rows
    .map((cells, index) => ({ cells, number: index + 1 }))
    .slice(headerIndex + 1)
    .filter(({ cells }) => !isBlank(cells));

  if (dataRows.length === 0) {
    throw new BadRequestException('La planilla no tiene filas con datos.');
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(
      `La planilla supera el máximo de ${MAX_IMPORT_ROWS} filas.`,
    );
  }

  const valid: CreateRecordDto[] = [];
  const errors: RowError[] = [];

  for (const { cells, number } of dataRows) {
    const cell = (field: ImportField) => {
      const index = columns.get(field);
      return index === undefined ? null : unquoteFormula(cells[index] ?? null);
    };
    const dto = plainToInstance(CreateRecordDto, {
      date: toDayString(cell('date')),
      ex: toText(cell('ex')),
      ifCode: toText(cell('ifCode')),
      subject: toText(cell('subject')),
      department: toText(cell('department')),
      forwarding: toForwarding(cell('forwarding')),
    });

    const rowErrors = await validate(dto);
    if (rowErrors.length) errors.push(...toErrors(number, rowErrors));
    else valid.push(dto);
  }

  return { totalRows: dataRows.length, valid, errors };
}
