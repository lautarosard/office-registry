import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginationQuery } from '../../common/dto/pagination-query.dto';
import { escapeLike } from '../../common/escape-like';
import { paginated } from '../../common/pagination';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { generateTemporaryPassword } from './temporary-password';

/** Never includes the password hash or tokenVersion. */
const publicUser = {
  id: true,
  dni: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: PaginationQuery) {
    const { q, page, pageSize } = query;
    let where: Prisma.UserWhereInput = {};

    if (q) {
      // "45.675" should find the DNI 45675017.
      const dni = /^[\d.\s]+$/.test(q) ? q.replace(/[.\s]/g, '') : q;
      const text = escapeLike(q);
      where = {
        OR: [
          { dni: { contains: escapeLike(dni) } },
          { username: { contains: text, mode: 'insensitive' } },
          { fullName: { contains: text, mode: 'insensitive' } },
        ],
      };
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: publicUser,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return paginated(users, total, query);
  }

  async create(dto: CreateUserDto) {
    await this.assertAvailable(dto);

    const temporaryPassword = generateTemporaryPassword();
    const user = await this.prisma.user.create({
      data: {
        dni: dto.dni,
        username: dto.username,
        fullName: dto.fullName,
        role: dto.role,
        password: await bcrypt.hash(temporaryPassword, 10),
        mustChangePassword: true,
      },
      select: publicUser,
    });

    // The only time the password is ever readable.
    return { ...user, temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const target = await this.findOrFail(id);

    // Also guarantees there is always at least one active administrator.
    const demotes = dto.role !== undefined && dto.role !== Role.ADMIN;
    if (id === actorId && (dto.isActive === false || demotes)) {
      throw new ForbiddenException(
        'No puede desactivar su propia cuenta ni quitarse el rol de administrador.',
      );
    }

    await this.assertAvailable(dto, id);

    const deactivates = dto.isActive === false && target.isActive;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        // So reactivating the account doesn't revive old sessions.
        tokenVersion: deactivates ? { increment: 1 } : undefined,
      },
      select: publicUser,
    });
  }

  async resetPassword(id: string, actorId: string) {
    // Resetting yourself would end the session before the password is shown.
    if (id === actorId) {
      throw new ForbiddenException(
        'Para su propia cuenta utilice "Cambiar contraseña".',
      );
    }
    await this.findOrFail(id);

    const temporaryPassword = generateTemporaryPassword();
    await this.prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(temporaryPassword, 10),
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
    });

    return { temporaryPassword };
  }

  private async findOrFail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('El usuario no existe.');
    return user;
  }

  /** Names the clashing field. The DB unique indexes still back this up. */
  private async assertAvailable(
    { dni, username }: { dni?: string; username?: string },
    exceptId?: string,
  ) {
    const id = exceptId ? { not: exceptId } : undefined;

    if (dni && (await this.prisma.user.count({ where: { id, dni } }))) {
      throw new ConflictException('Ya existe un usuario con ese DNI.');
    }
    if (
      username &&
      (await this.prisma.user.count({
        // "JPerez" and "jperez" would be confused for one another.
        where: {
          id,
          username: { equals: escapeLike(username), mode: 'insensitive' },
        },
      }))
    ) {
      throw new ConflictException('Ya existe un usuario con ese nombre.');
    }
  }
}
