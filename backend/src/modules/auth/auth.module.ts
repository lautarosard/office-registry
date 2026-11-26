import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './api/controllers/auth.controller';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MustChangePasswordGuard } from '../../common/guards/must-change-password.guard';
import type { EnvVars } from '../../config/env.validation';

@Module({
  imports: [
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
    // Only applies where ThrottlerGuard is used (login, change-password).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        errorMessage:
          'Demasiados intentos. Espere un momento e intente nuevamente.',
        throttlers: [
          {
            ttl:
              config.get('LOGIN_THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
            limit: config.get('LOGIN_THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    // Global guards run in this order: authenticate, then check the flag.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
