import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '../common/enums/role.enum';
import { generateTempPassword } from './utils/password.util';
import { UserRepository } from './user.repository';
import { IUserService } from '../interfaces/iuser.service';

@Injectable()
export class UsersService implements IUserService{
  constructor(private readonly userRepo: UserRepository) {}

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
      role: dto.role,
      isActive: true,
      mustChangePassword: true,
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      tempPassword, // devolver SOLO una vez
    };
  }
}
