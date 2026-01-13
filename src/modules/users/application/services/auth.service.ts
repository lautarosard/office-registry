import { IUserRepository} from '../../domain/iRepository/iuser.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import {LoginRequest} from '../models/requests/login.request';
import {loginResponse} from '../models/responses/login.response';
import {registerRequest} from '../models/requests/register.request';

export class AuthService implements IAuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async login(data: LoginRequest): Promise<loginResponse> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('User not found');
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ username: user.username }, 'secret');
  }

  async register(data: registerRequest): Promise<boolean> {
    const user = await this.userRepository.findByEmail(data.email);
    if (user) {
      return false;
    }
    await this.userRepository.create(data);
    return true;
  }

}
