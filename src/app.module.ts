import { Module } from '@nestjs/common';
import { UserModule} from './modules/Users/users.module'
import { RecordModule} from './modules/Records/records.module'
import { Controller } from './src/modules/records/api/controllers/.controller';
import { Controller } from './modules/records/api/controllers/.controller';
import { Controller } from './modules/records/api/controllers/.controller';
import { Controller } from './src/modules/records/api/controllers/.controller';
import {PrismaModule} from './database/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module';
@Module({
  imports: [UserModule,RecordModule, PrismaModule, AuthModule],
  controllers: [Controller],
  providers: [],
})
export class AppModule {}
