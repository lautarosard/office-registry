import { Role } from '@prisma/client';

/** ADMIN may change any record; USER only the ones they created. */
export function canModifyRecord(
  user: { userId: string; role: Role },
  record: { createdById: string },
): boolean {
  return user.role === Role.ADMIN || record.createdById === user.userId;
}
