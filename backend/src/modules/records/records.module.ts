import { Module } from '@nestjs/common';
import { RecordsController } from './records.controller';
import { RecordsIoService } from './records-io.service';
import { RecordsService } from './records.service';

@Module({
  controllers: [RecordsController],
  providers: [RecordsService, RecordsIoService],
})
export class RecordsModule {}
