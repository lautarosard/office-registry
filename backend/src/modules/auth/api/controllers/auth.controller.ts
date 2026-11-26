import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AllowMustChangePassword } from '../../../../common/decorators/allow-must-change-password.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { ChangePasswordRequest } from '../../application/models/requests/change-password.request';
import { LoginRequest } from '../../application/models/requests/login.request';
import { ChangePasswordResponse } from '../../application/models/responses/change-password.response';
import { MeResponse } from '../../application/models/responses/me.response';
import { AuthService } from '../../application/services/auth.service';
import type { AuthenticatedUser } from '../../application/strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 201, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 429, description: 'Too many attempts.' })
  async login(@Body() loginDto: LoginRequest) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @AllowMustChangePassword()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  @ApiResponse({ status: 200, type: MeResponse })
  me(@CurrentUser() user: AuthenticatedUser): MeResponse {
    return {
      id: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  @Post('change-password')
  @HttpCode(200)
  @AllowMustChangePassword()
  // Also throttled: it verifies a password, so it can be brute-forced too.
  @UseGuards(ThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 200, description: 'Returns a fresh access token.' })
  @ApiResponse({ status: 400, description: 'Invalid password.' })
  @ApiResponse({ status: 429, description: 'Too many attempts.' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    return this.authService.changePassword(user.userId, dto);
  }
}
