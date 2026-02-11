
import { Controller, Post, Body, Inject } from '@nestjs/common';
import { IAuthService } from '../../application/interfaces/iauth.service';
import { LoginRequest } from '../../application/models/requests/login.request';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IAuthService)
    private readonly authService: IAuthService,
  ) { }

  @Post('login')
  async login(@Body() loginDto: LoginRequest) {
    return this.authService.login(loginDto);
  }
}
