import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ImportRecordsQuery {
  @ApiPropertyOptional({
    default: false,
    description: 'Validate and report without saving anything',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'dryRun debe ser true o false.' })
  dryRun: boolean = false;
}
