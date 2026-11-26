import { z } from 'zod';

// Mirrors the backend ChangePasswordRequest DTO, which is authoritative.
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ignores the rest

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingrese su contraseña actual.'),
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `La nueva contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      )
      .refine(
        (value) =>
          new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
        'La nueva contraseña es demasiado larga.',
      )
      .regex(/\p{L}/u, 'La nueva contraseña debe incluir al menos una letra.')
      .regex(/\d/, 'La nueva contraseña debe incluir al menos un número.'),
    confirmPassword: z.string().min(1, 'Repita la nueva contraseña.'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta de la actual.',
  })
  .refine((data) => data.confirmPassword === data.newPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
