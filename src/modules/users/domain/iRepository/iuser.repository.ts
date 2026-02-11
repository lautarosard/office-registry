import { User } from '@prisma/client';
import type { CreateUserData } from '../../application/models/requests/createUserData.requets';
export abstract class IUserRepository {
  abstract create(data: CreateUserData): Promise<User>;
  //abstract findByEmail(email: string): Promise<User>;
  //abstract findById(id: string): Promise<User>;
  abstract delete(id: string): Promise<User>;
  abstract update(id: string, data: Partial<User>): Promise<User>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract getAll(): Promise<User[]>;
}
