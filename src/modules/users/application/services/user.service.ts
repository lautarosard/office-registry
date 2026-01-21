import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../models/requests/createUser.request';
import { Role } from '../../../../common/enums/role.enum';
import { generateTempPassword } from './../utils/password.util';
import {PrismaUserRepository } from './../../infrastructure/persistance/user.repository';
import { IUserService } from '../interfaces/iuser.service';

@Injectable()
export class UsersService implements IUserService{
  constructor(private readonly userRepo: PrismaUserRepository) {}

  async createUser(dto: CreateUserDto) {
    const exists = await this.userRepo.findByUsername(dto.username);

    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.userRepo.create({
      username: dto.username,
      password: hashedPassword
    });

    return {
      id: user.id,
      username: user.username,
      rol: user.rol,
      tempPassword, // devolver SOLO una vez
    };
  }
}
