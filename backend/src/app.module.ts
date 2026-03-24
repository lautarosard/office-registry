import { Module } from '@nestjs/common';
import { UserModule } from './modules/users/users.module';
import { RecordModule } from './modules/records/records.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [PrismaModule, UserModule, AuthModule, RecordModule],
})
export class AppModule {}
