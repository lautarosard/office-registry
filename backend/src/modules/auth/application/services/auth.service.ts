import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IAuthService } from '../interfaces/iauth.service';
import * as bcrypt from 'bcrypt';
import { LoginRequest } from '../models/requests/login.request';
import { loginResponse } from '../models/responses/login.response';
import { IUserRepository } from '../../../users/domain/iRepository/iuser.repository';

@Injectable()
export class AuthService implements IAuthService {
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

    const payload = {
      sub: user.id,
      role: user.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken: accessToken,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
