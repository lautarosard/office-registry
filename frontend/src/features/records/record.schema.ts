import { z } from 'zod';

// Mirrors the backend CreateRecordDto, which is authoritative.
const EX_PATTERN = /^EX-\d{4}-\d+-.+$/;
const IF_PATTERN = /^IF-\d{4}-\d+-.+$/;

const required = (name: string, max: number, tooLong: string) =>
  z.string().trim().min(1, `Ingrese ${name}.`).max(max, tooLong);

const gdeNumber = (name: string, pattern: RegExp) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .min(1, `Ingrese el ${name}.`)
    .max(128, `El ${name} es demasiado largo.`)
    .regex(pattern, `El ${name} debe tener el formato ${name}-AAAA-NÚMERO-...`);

export const recordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingrese una fecha válida.'),
  ex: gdeNumber('EX', EX_PATTERN),
  ifCode: gdeNumber('IF', IF_PATTERN),
  subject: required('el motivo', 500, 'El motivo es demasiado largo.'),
  department: required(
    'la repartición',
    128,
    'La repartición es demasiado larga.',
  ),
  forwarding: z.string().trim().max(128, 'El pase es demasiado largo.'),
});

export type RecordForm = z.infer<typeof recordSchema>;
