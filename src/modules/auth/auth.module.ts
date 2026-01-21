import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './api/controllers/auth.controller';
import { UserModule } from '../users/users.module';
import { JwtStrategy } from './application/strategies/jwt.strategy';

@Module({
  imports:[
    UserModule,
    JwtModule.register({
    secret: process.env.JWT_SECRET || 'dev_secret',
    signOptions: { 
    expiresIn: '1d' 
    },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
