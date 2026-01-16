import { CreateUserDto } from '../models/requests/createUser.request';
export abstract class IUserService {
  abstract createUser(data: CreateUserDto): Promise<void>;
}
