import { Module } from '@nestjs/common';
import { RecordController } from './api/controllers/record.controller';
import { IRecordService } from './application/interfaces/irecord.service';
import { RecordService } from './application/services/record.service';
import { IRecordRepository } from './domain/iRepository/irecord.repository';
import { PrismaRecordRepository } from './infrastructure/persistance/prisma-record.repository';

@Module({
  controllers: [RecordController],
  providers: [
    {
      provide: IRecordService,
      useClass: RecordService,
    },
    {
      provide: IRecordRepository,
      useClass: PrismaRecordRepository,
    },
  ],
  exports: [IRecordService, IRecordRepository],
})
export class RecordModule { }
