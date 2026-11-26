import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

// Fields may be omitted, but never sent as null.
export class UpdateUserDto extends PartialType(CreateUserDto, {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @ValidateIf((_dto, value) => value !== undefined)
  @IsBoolean({ message: 'El estado no es válido.' })
  isActive?: boolean;
}
