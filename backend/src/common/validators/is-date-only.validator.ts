import { ValidateBy, ValidationOptions } from 'class-validator';

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDateOnly(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // Rejects overflows such as 2026-02-30, which Date would roll into March.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const IsDateOnly = (options?: ValidationOptions) =>
  ValidateBy(
    { name: 'isDateOnly', validator: { validate: isDateOnly } },
    options,
  );
