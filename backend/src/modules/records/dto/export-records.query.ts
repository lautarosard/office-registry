import {
  ApiPropertyOptional,
  IntersectionType,
  PickType,
} from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SearchRecordsQuery } from './search-records.query';

export const EXPORT_FORMATS = ['xlsx', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class FormatQuery {
  @ApiPropertyOptional({ enum: EXPORT_FORMATS, default: 'xlsx' })
  @IsOptional()
  @IsIn(EXPORT_FORMATS, { message: 'El formato debe ser xlsx o csv.' })
  format: ExportFormat = 'xlsx';
}

/** Same filters as the list, without pagination. */
export class ExportRecordsQuery extends IntersectionType(
  PickType(SearchRecordsQuery, ['q', 'from', 'to'] as const),
  FormatQuery,
) {}
