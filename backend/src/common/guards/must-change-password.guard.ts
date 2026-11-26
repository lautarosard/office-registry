import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_MUST_CHANGE_PASSWORD_KEY } from '../decorators/allow-must-change-password.decorator';
import type { AuthenticatedUser } from '../../modules/auth/application/strategies/jwt.strategy';

/** Machine-readable code the frontend uses to redirect to the change form. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

/**
 * Global guard, runs after JwtAuthGuard. Blocks users with a pending password
 * change from everything except routes marked @AllowMustChangePassword().
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    // No user means a @Public() route: JwtAuthGuard already let it through.
    if (!user?.mustChangePassword) return true;

    const allowed = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_MUST_CHANGE_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      code: PASSWORD_CHANGE_REQUIRED,
      message: 'Debe cambiar su contraseña antes de continuar.',
    });
  }
}
