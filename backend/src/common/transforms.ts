import { Transform } from 'class-transformer';

// DTO input normalization. Non-strings pass through so validators reject them.
const onString = (fn: (value: string) => unknown) =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? fn(value) : value,
  );

export const Trim = () => onString((value) => value.trim());

export const TrimUpperCase = () =>
  onString((value) => value.trim().toUpperCase());

/** Trims; a blank string becomes null. */
export const TrimToNull = () => onString((value) => value.trim() || null);

/** "45.675.017" -> "45675017" */
export const StripDniSeparators = () =>
  onString((value) => value.replace(/[.\s]/g, ''));
