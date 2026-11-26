/**
 * Prisma passes `contains` (and case-insensitive `equals`) to LIKE / ILIKE
 * without escaping, so "%" and "_" typed by a user would act as wildcards.
 */
export const escapeLike = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');
