import { User } from './../../../../database/prisma/prisma.service';

export abstract class IUserRepository {
  abstract create(data: Omit<User,'id'>): Promise<User>;
  //abstract findByEmail(email: string): Promise<User>;
  //abstract findById(id: string): Promise<User>;
  abstract delete(id: string): Promise<User>;
  abstract update(id: string,data: Partial<User>): Promise<User>;
  abstract findByUsername(username: string): Promise<User>;
  abstract getAll(): Promise<User[]>
}
