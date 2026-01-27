import { User } from '../../../../database/generated/prisma/client';
import { CreateUserDto } from '../../application/models/requests/createUser.request';
export abstract class IUserRepository {
  abstract create(data: CreateUserDto ): Promise<User>;
  //abstract findByEmail(email: string): Promise<User>;
  //abstract findById(id: string): Promise<User>;
  abstract delete(id: string): Promise<User>;
  abstract update(id: string,data: Partial<User>): Promise<User>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract getAll(): Promise<User[]>
}
