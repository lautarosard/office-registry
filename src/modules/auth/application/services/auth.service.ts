import { JwtService } from '@nestjs/jwt';
import { IAuthService } from '../interfaces/iauth.service';
@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequestDto) {
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
