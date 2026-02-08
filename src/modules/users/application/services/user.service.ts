import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../models/requests/createUser.request';
import { generateTempPassword } from '../utils/password.util';
import { IUserRepository } from '../../domain/iRepository/iuser.repository';
import { IUserService } from '../interfaces/iuser.service';
import { UserResponse } from '../models/responses/user.response';
@Injectable()
export class UsersService implements IUserService {
  constructor(
    private readonly userRepo: IUserRepository,
  ) {}

  async createUser(dto: CreateUserDto) {
    const exists = await this.userRepo.findByUsername(dto.username);

    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.userRepo.create({
      username: dto.username,
      password: hashedPassword,
      rol: dto.role,
      name: dto.name,
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      rol: user.rol,
      tempPass: tempPassword, //  solo se devuelve una vez
    };
  }
}
