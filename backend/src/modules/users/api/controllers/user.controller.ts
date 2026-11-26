import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';

import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { IUserService } from '../../application/interfaces/iuser.service';
import { CreateUserDto } from '../../application/models/requests/createUser.request';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
// Authentication is enforced by the global JwtAuthGuard.
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    @Inject(IUserService)
    private readonly userService: IUserService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }
}
