import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, Role } from '@prisma/client';
import { paginated } from '../../common/pagination';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/application/strategies/jwt.strategy';
import { CreateRecordDto } from './dto/create-record.dto';
import { SearchRecordsQuery } from './dto/search-records.query';
import { UpdateRecordDto } from './dto/update-record.dto';
import {
  recordInclude,
  toAuditResponse,
  toDateColumn,
  toDay,
  toRecordResponse,
  toSnapshot,
  userRef,
  type RecordWithUsers,
} from './record.mapper';
import { recordOrder, recordWhere } from './record.filters';
import { canModifyRecord } from './records.policy';

/** Suggestions offered per catalog, most used first. */
const CATALOG_LIMIT = 500;

const notFound = () => new NotFoundException('El registro no existe.');

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchRecordsQuery) {
    const { page, pageSize } = query;
    const where = recordWhere(query);

    const [total, records] = await this.prisma.$transaction([
      this.prisma.record.count({ where }),
      this.prisma.record.findMany({
        where,
        include: recordInclude,
        orderBy: recordOrder,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return paginated(records.map(toRecordResponse), total, query);
  }

  /** Distinct values already in use, for the form's autocomplete. */
  async catalogs() {
    const active = { deletedAt: null };
    const [subjects, departments, forwardings] = await Promise.all([
      this.prisma.record.groupBy({
        by: ['subject'],
        where: active,
        orderBy: [{ _count: { subject: 'desc' } }, { subject: 'asc' }],
        take: CATALOG_LIMIT,
      }),
      this.prisma.record.groupBy({
        by: ['department'],
        where: active,
        orderBy: [{ _count: { department: 'desc' } }, { department: 'asc' }],
        take: CATALOG_LIMIT,
      }),
      this.prisma.record.groupBy({
        by: ['forwarding'],
        where: { ...active, forwarding: { not: null } },
        orderBy: [{ _count: { forwarding: 'desc' } }, { forwarding: 'asc' }],
        take: CATALOG_LIMIT,
      }),
    ]);

    return {
      subjects: subjects.map((row) => row.subject),
      departments: departments.map((row) => row.department),
      forwardings: forwardings.map((row) => row.forwarding as string),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, deletedAt: null },
      include: recordInclude,
    });
    if (!record) throw notFound();
    return toRecordResponse(record);
  }

  async create(dto: CreateRecordDto, user: AuthenticatedUser) {
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.record.create({
        data: {
          ...dto,
          date: toDateColumn(dto.date),
          createdById: user.userId,
        },
        include: recordInclude,
      });
      await tx.auditLog.create({
        data: {
          recordId: created.id,
          action: AuditAction.CREATE,
          performedById: user.userId,
          after: toSnapshot(created),
        },
      });
      return created;
    });

    return toRecordResponse(record);
  }

  async update(id: string, dto: UpdateRecordDto, user: AuthenticatedUser) {
    const record = await this.prisma.$transaction(async (tx) => {
      const current = await this.lockForChange(tx, id, user);
      const changes = this.changedFields(current, dto);

      // Nothing differs: don't touch the row or add noise to its history.
      if (Object.keys(changes).length === 0) return current;

      const updated = await tx.record.update({
        where: { id },
        data: { ...changes, updatedById: user.userId },
        include: recordInclude,
      });
      await tx.auditLog.create({
        data: {
          recordId: id,
          action: AuditAction.UPDATE,
          performedById: user.userId,
          before: toSnapshot(current),
          after: toSnapshot(updated),
        },
      });
      return updated;
    });

    return toRecordResponse(record);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockForChange(tx, id, user);
      const deleted = await tx.record.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById: user.userId },
      });
      await tx.auditLog.create({
        data: {
          recordId: id,
          action: AuditAction.DELETE,
          performedById: user.userId,
          before: toSnapshot(current),
          after: toSnapshot(deleted),
        },
      });
    });
  }

  async history(id: string, user: AuthenticatedUser) {
    const record = await this.prisma.record.findUnique({ where: { id } });
    // Only administrators can still consult the history of a deleted record.
    if (!record || (record.deletedAt && user.role !== Role.ADMIN)) {
      throw notFound();
    }

    const entries = await this.prisma.auditLog.findMany({
      where: { recordId: id },
      include: { performedBy: userRef },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return entries.map(toAuditResponse);
  }

  /**
   * Loads an active record the user may change. The row stays locked until the
   * transaction ends, so concurrent edits can't record a stale `before`.
   */
  private async lockForChange(
    tx: Prisma.TransactionClient,
    id: string,
    user: AuthenticatedUser,
  ): Promise<RecordWithUsers> {
    await tx.$queryRaw`SELECT 1 FROM "Record" WHERE "id" = ${id} FOR UPDATE`;
    const record = await tx.record.findFirst({
      where: { id, deletedAt: null },
      include: recordInclude,
    });

    if (!record) throw notFound();
    if (!canModifyRecord(user, record)) {
      throw new ForbiddenException(
        'Solo puede modificar o eliminar los registros que usted cargó.',
      );
    }
    return record;
  }

  private changedFields(
    current: RecordWithUsers,
    dto: UpdateRecordDto,
  ): Prisma.RecordUncheckedUpdateInput {
    const { date, ...rest } = dto;
    const changes: Record<string, unknown> = {};

    if (date !== undefined && date !== toDay(current.date)) {
      changes.date = toDateColumn(date);
    }
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== current[key as keyof typeof rest]) {
        changes[key] = value;
      }
    }
    return changes;
  }
}
