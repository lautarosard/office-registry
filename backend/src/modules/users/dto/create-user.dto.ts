import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { StripDniSeparators, Trim } from '../../../common/transforms';

export class CreateUserDto {
  @ApiProperty({ example: '45675017', description: 'Dots are accepted' })
  @StripDniSeparators()
  @IsString({ message: 'Ingrese el DNI.' })
  @Matches(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos.' })
  dni: string;

  @ApiProperty({ example: 'jperez' })
  @Trim()
  @IsString({ message: 'Ingrese el usuario.' })
  @IsNotEmpty({ message: 'Ingrese el usuario.' })
  @MaxLength(64, { message: 'El usuario es demasiado largo.' })
  username: string;

  @ApiProperty({ example: 'Juana Pérez' })
  @Trim()
  @IsString({ message: 'Ingrese el nombre.' })
  @IsNotEmpty({ message: 'Ingrese el nombre.' })
  @MaxLength(128, { message: 'El nombre es demasiado largo.' })
  fullName: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role, { message: 'El rol no es válido.' })
  role: Role;
}
