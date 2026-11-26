import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { LoginRequest } from '../models/requests/login.request';
import { ChangePasswordRequest } from '../models/requests/change-password.request';
import { loginResponse } from '../models/responses/login.response';
import { ChangePasswordResponse } from '../models/responses/change-password.response';
import { IUserRepository } from '../../../users/domain/iRepository/iuser.repository';
import type { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequest): Promise<loginResponse> {
    const user = await this.userRepo.findByUsername(dto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password);

    if (!passwordOk) {
      throw new UnauthorizedException();
    }

    return {
      accessToken: this.signToken(user),
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    // 400, not 401: the session is valid, only the form input is wrong.
    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    const updated = await this.userRepo.update(user.id, {
      password: await bcrypt.hash(dto.newPassword, 10),
      mustChangePassword: false,
    });

    return {
      accessToken: this.signToken(updated),
      mustChangePassword: updated.mustChangePassword,
    };
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return this.jwtService.sign(payload);
  }
}
