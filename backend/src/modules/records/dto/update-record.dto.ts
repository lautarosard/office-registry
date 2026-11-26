import { PartialType } from '@nestjs/swagger';
import { CreateRecordDto } from './create-record.dto';

// Fields may be omitted. `skipNullProperties: false` keeps `null` invalid for
// required columns; `forwarding` stays nullable through its own @IsOptional.
export class UpdateRecordDto extends PartialType(CreateRecordDto, {
  skipNullProperties: false,
}) {}
