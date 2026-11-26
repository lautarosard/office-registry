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
import { PrismaService } from '../../../../database/prisma/prisma.service';
import type { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequest): Promise<loginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

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

    const updated = await this.prisma.user.update({
      // Fails if the password was reset while this request was running.
      where: { id: user.id, tokenVersion: user.tokenVersion },
      data: {
        password: await bcrypt.hash(dto.newPassword, 10),
        mustChangePassword: false,
        tokenVersion: { increment: 1 }, // signs out every other session
      },
    });

    return {
      accessToken: this.signToken(updated),
      mustChangePassword: updated.mustChangePassword,
    };
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, ver: user.tokenVersion };

    return this.jwtService.sign(payload);
  }
}
