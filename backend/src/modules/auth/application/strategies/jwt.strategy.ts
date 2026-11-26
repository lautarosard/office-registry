import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { EnvVars } from '../../../../config/env.validation';
import { IUserRepository } from '../../../users/domain/iRepository/iuser.repository';

export interface JwtPayload {
  sub: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvVars, true>,
    private readonly userRepo: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  /**
   * Runs on every authenticated request. The user is re-read from the DB so
   * deactivation, deletion and role changes apply immediately.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      // Either source restricts: a token issued for a temporary password stays
      // restricted after the change, and a later admin reset applies to tokens
      // that are already out. A token without the claim is restricted too.
      mustChangePassword:
        user.mustChangePassword || payload.mustChangePassword !== false,
    };
  }
}
