import { Prisma } from '@prisma/client';
import { escapeLike } from '../../common/escape-like';
import { toDateColumn } from './record.mapper';

const SEARCH_FIELDS = [
  'ex',
  'ifCode',
  'subject',
  'department',
  'forwarding',
] as const;

export interface RecordFilters {
  q?: string;
  from?: string;
  to?: string;
}

/** Newest first; `id` only makes the order stable. */
export const recordOrder: Prisma.RecordOrderByWithRelationInput[] = [
  { date: 'desc' },
  { createdAt: 'desc' },
  { id: 'desc' },
];

/** Active records matching the filters. Used by the list and the export. */
export function recordWhere({
  q,
  from,
  to,
}: RecordFilters): Prisma.RecordWhereInput {
  return {
    deletedAt: null,
    date: {
      gte: from ? toDateColumn(from) : undefined,
      lte: to ? toDateColumn(to) : undefined,
    },
    OR: q
      ? SEARCH_FIELDS.map((field) => ({
          [field]: { contains: escapeLike(q), mode: 'insensitive' },
        }))
      : undefined,
  };
}
