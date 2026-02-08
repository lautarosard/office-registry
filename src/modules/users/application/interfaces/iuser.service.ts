import { CreateUserDto } from '../models/requests/createUser.request';
import { UserResponse } from '../models/responses/user.response';
export abstract class IUserService {
  abstract createUser(data: CreateUserDto): Promise<UserResponse>;
}
