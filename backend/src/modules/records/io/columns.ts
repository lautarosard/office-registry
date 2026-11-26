/** The office spreadsheet's columns, in order. Shared by import and export. */
export const IMPORT_COLUMNS = [
  { field: 'date', header: 'Fecha', width: 12, required: true },
  { field: 'ex', header: 'EX', width: 36, required: true },
  { field: 'ifCode', header: 'IF', width: 38, required: true },
  { field: 'subject', header: 'Motivo', width: 40, required: true },
  { field: 'department', header: 'Repartición', width: 18, required: true },
  { field: 'forwarding', header: 'Pase', width: 18, required: false },
] as const;

export type ImportField = (typeof IMPORT_COLUMNS)[number]['field'];

/** Export adds the author. Import ignores it, so an export can be re-read. */
export const EXPORT_COLUMNS = [
  ...IMPORT_COLUMNS,
  { header: 'Cargado por', width: 24 },
];
