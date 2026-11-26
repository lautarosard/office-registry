import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './api/controllers/auth.controller';
import { UserModule } from '../users/users.module';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { IAuthService } from './application/interfaces/iauth.service';
import type { EnvVars } from '../../config/env.validation';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          // Format ("15m", "8h", "1d") is enforced by envValidationSchema.
          expiresIn: config.get('JWT_EXPIRES_IN', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [
    {
      provide: IAuthService,
      useClass: AuthService,
    },
    JwtStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
