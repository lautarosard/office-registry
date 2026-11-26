import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/users/users.module';
import { RecordModule } from './modules/records/records.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Joi 18 implements Standard Schema, which @nestjs/config v12 expects.
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    RecordModule,
  ],
})
export class AppModule {}
