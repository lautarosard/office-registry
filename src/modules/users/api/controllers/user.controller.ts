import {
  Controller,
  Post,
  Body,
  UseGuards,
  Inject
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Role } from '../../../../common/enums/role.enum';

import { IUserService } from '../../application/interfaces/iuser.service';
import { CreateUserDto } from '../../application/models/requests/createUser.request';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {

  constructor(
    @Inject(IUserService)
    private readonly userService: IUserService,
  ) { }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }
}
