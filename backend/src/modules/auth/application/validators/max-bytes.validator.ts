import { ValidateBy, ValidationOptions } from 'class-validator';

/** Limits the UTF-8 byte length (not the character count) of a string. */
export const MaxBytes = (max: number, options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'maxBytes',
      constraints: [max],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
      },
    },
    options,
  );
