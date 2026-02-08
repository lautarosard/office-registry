import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { IUserRepository } from '../../domain/iRepository/iuser.repository';
import { User } from '../../../../database/generated/prisma/client';
import type { CreateUserData } from '../../application/models/requests/createUserData.requets';
import { RoleUser } from '../../../../database/generated/prisma/enums';
import { Role } from '../../../../common/enums/role.enum';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Mapeo de Role a RoleUser
  private mapRoleToPrisma(role: Role): RoleUser {
    const mapping: Record<Role, RoleUser> = {
      [Role.USER]: RoleUser.User,
      [Role.ADMIN]: RoleUser.Admin,
      [Role.SUPER_ADMIN]: RoleUser.SuperAdmin,
    };
    return mapping[role];
  }

  async getAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ 
      data: {
        username: data.username,
        password: data.password,
        rol: this.mapRoleToPrisma(data.rol),
        name: data.name,
      }
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
