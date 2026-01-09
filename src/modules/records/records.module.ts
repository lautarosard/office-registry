import { Module} from '@nestjs/common';
import { RecordController } from './api/controllers/record.controller';

@Module({
  controllers: [RecordController]
})
export class RecordModule{}
