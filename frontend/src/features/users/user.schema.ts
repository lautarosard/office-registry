import { z } from 'zod';

// Mirrors the backend CreateUserDto, which is authoritative.
export const userSchema = z.object({
  dni: z
    .string()
    .transform((value) => value.replace(/[.\s]/g, ''))
    .pipe(z.string().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos.')),
  username: z
    .string()
    .trim()
    .min(1, 'Ingrese el usuario.')
    .max(64, 'El usuario es demasiado largo.'),
  fullName: z
    .string()
    .trim()
    .min(1, 'Ingrese el nombre.')
    .max(128, 'El nombre es demasiado largo.'),
  role: z.enum(['USER', 'ADMIN']),
});

export type UserForm = z.infer<typeof userSchema>;
