import { Module } from '@nestjs/common';
import { UserModule} from './modules/Users/users.module'
import { RecordModule} from './modules/Records/records.module'
import { Controller } from './src/modules/records/api/controllers/.controller';
import { Controller } from './modules/records/api/controllers/.controller';
import { Controller } from './modules/records/api/controllers/.controller';
import { Controller } from './src/modules/records/api/controllers/.controller';
@Module({
  imports: [UserModule,RecordModule],
  controllers: [Controller],
  providers: [],
})
export class AppModule {}
