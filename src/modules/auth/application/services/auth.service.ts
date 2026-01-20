import { JwtService } from '@nestjs/jwt';
import {Injectable,UnauthorizedException} from '@nestjs/common'
import { IAuthService } from '../interfaces/iauth.service';
import * as bcrypt from 'bcrypt';
import {LoginRequest} from '../models/requests/login.request';
import {loginResponse} from '../models/responses/login.response';
import {PrismaUserRepository} from "../../../users/infrastructure/persistance/user.repository";
@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: PrismaUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequest):Promise<loginResponse> {
    const user = await this.userRepo.findByUsername(dto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const passwordOk = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!passwordOk) {
      throw new UnauthorizedException();
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
