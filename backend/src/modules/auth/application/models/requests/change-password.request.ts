import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MaxBytes } from '../../validators/max-bytes.validator';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt silently ignores everything past 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

export class ChangePasswordRequest {
  @ApiProperty()
  @IsString({ message: 'Ingrese su contraseña actual.' })
  @IsNotEmpty({ message: 'Ingrese su contraseña actual.' })
  @MaxLength(128, { message: 'La contraseña actual es demasiado larga.' })
  currentPassword: string;

  @ApiProperty({
    description: 'At least 8 characters, with a letter and a number.',
  })
  @IsString({ message: 'Ingrese la nueva contraseña.' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La nueva contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxBytes(PASSWORD_MAX_BYTES, {
    message: 'La nueva contraseña es demasiado larga.',
  })
  @Matches(/\p{L}/u, {
    message: 'La nueva contraseña debe incluir al menos una letra.',
  })
  @Matches(/\d/, {
    message: 'La nueva contraseña debe incluir al menos un número.',
  })
  newPassword: string;
}
