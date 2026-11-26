import { Prisma, type AuditLog, type Record } from '@prisma/client';

/** The only user columns that ever leave the API alongside a record. */
export const userRef = {
  select: { id: true, username: true, fullName: true },
} satisfies Prisma.UserDefaultArgs;

export const recordInclude = {
  createdBy: userRef,
  updatedBy: userRef,
} satisfies Prisma.RecordInclude;

export type RecordWithUsers = Prisma.RecordGetPayload<{
  include: typeof recordInclude;
}>;

/** `date` is a calendar day: stored at UTC midnight, exposed as YYYY-MM-DD. */
export const toDateColumn = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const toDay = (date: Date) => date.toISOString().slice(0, 10);

export function toRecordResponse(record: RecordWithUsers) {
  return {
    id: record.id,
    date: toDay(record.date),
    ex: record.ex,
    ifCode: record.ifCode,
    subject: record.subject,
    department: record.department,
    forwarding: record.forwarding,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

/** JSON stored in AuditLog.before / AuditLog.after. */
export function toSnapshot(record: Record): Prisma.InputJsonObject {
  return {
    date: toDay(record.date),
    ex: record.ex,
    ifCode: record.ifCode,
    subject: record.subject,
    department: record.department,
    forwarding: record.forwarding,
    createdById: record.createdById,
    updatedById: record.updatedById,
    deletedAt: record.deletedAt?.toISOString() ?? null,
  };
}

export function toAuditResponse(
  entry: AuditLog & {
    performedBy: { id: string; username: string; fullName: string };
  },
) {
  return {
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    before: entry.before,
    after: entry.after,
    performedBy: entry.performedBy,
  };
}
