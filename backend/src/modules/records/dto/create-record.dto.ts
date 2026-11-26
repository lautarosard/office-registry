import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim, TrimToNull, TrimUpperCase } from '../../../common/transforms';
import { IsDateOnly } from '../../../common/validators/is-date-only.validator';

// Only the stable GDE prefix (type, year, number) is checked: the unit and
// organism suffix varies too much to be worth rejecting.
export const EX_PATTERN = /^EX-\d{4}-\d+-.+$/;
export const IF_PATTERN = /^IF-\d{4}-\d+-.+$/;

export class CreateRecordDto {
  @ApiProperty({ example: '2026-11-26' })
  @IsDateOnly({ message: 'Ingrese una fecha válida.' })
  date: string;

  @ApiProperty({ example: 'EX-2025-93504106- -APN-DIFP#PFA' })
  @TrimUpperCase()
  @IsString({ message: 'Ingrese el EX.' })
  @IsNotEmpty({ message: 'Ingrese el EX.' })
  @MaxLength(128, { message: 'El EX es demasiado largo.' })
  @Matches(EX_PATTERN, {
    message: 'El EX debe tener el formato EX-AAAA-NÚMERO-...',
  })
  ex: string;

  @ApiProperty({ example: 'IF-2025-93911988-APN-SOPDGA#PFA' })
  @TrimUpperCase()
  @IsString({ message: 'Ingrese el IF.' })
  @IsNotEmpty({ message: 'Ingrese el IF.' })
  @MaxLength(128, { message: 'El IF es demasiado largo.' })
  @Matches(IF_PATTERN, {
    message: 'El IF debe tener el formato IF-AAAA-NÚMERO-...',
  })
  ifCode: string;

  @ApiProperty({ example: 'Diagramación de servicio' })
  @Trim()
  @IsString({ message: 'Ingrese el motivo.' })
  @IsNotEmpty({ message: 'Ingrese el motivo.' })
  @MaxLength(500, { message: 'El motivo es demasiado largo.' })
  subject: string;

  @ApiProperty({ example: 'DGO#PFA' })
  @Trim()
  @IsString({ message: 'Ingrese la repartición.' })
  @IsNotEmpty({ message: 'Ingrese la repartición.' })
  @MaxLength(128, { message: 'La repartición es demasiado larga.' })
  department: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @TrimToNull()
  @IsString({ message: 'El pase no es válido.' })
  @MaxLength(128, { message: 'El pase es demasiado largo.' })
  forwarding?: string | null;
}
