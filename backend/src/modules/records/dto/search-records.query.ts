import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination-query.dto';
import { IsDateOnly } from '../../../common/validators/is-date-only.validator';

export class SearchRecordsQuery extends PaginationQuery {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive' })
  @IsOptional()
  @IsDateOnly({ message: 'La fecha "Desde" no es válida.' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive' })
  @IsOptional()
  @IsDateOnly({ message: 'La fecha "Hasta" no es válida.' })
  to?: string;
}
