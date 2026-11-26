import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/application/strategies/jwt.strategy';
import { CreateRecordDto } from './dto/create-record.dto';
import type {
  ExportFormat,
  ExportRecordsQuery,
} from './dto/export-records.query';
import { EXPORT_COLUMNS, IMPORT_COLUMNS } from './io/columns';
import { parseImportRows, type RowError } from './io/import-rows';
import { readSpreadsheet } from './io/spreadsheet-reader';
import { spreadsheetStream } from './io/spreadsheet-writer';
import { recordOrder, recordWhere } from './record.filters';
import { toDateColumn, toDay, toSnapshot, userRef } from './record.mapper';

export interface ImportReport {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  /** Valid rows identical to a record already stored. A warning only. */
  duplicateCount: number;
  errors: RowError[];
  importedCount: number;
}

// Keeps each INSERT below Postgres' limit on bound parameters.
const BATCH = 1000;

const batches = <T>(items: T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) =>
    items.slice(i * BATCH, (i + 1) * BATCH),
  );

/** Identity of a movement, for duplicate detection. */
const fingerprint = (r: {
  date: string;
  ex: string;
  ifCode: string;
  subject: string;
  department: string;
  forwarding?: string | null;
}) =>
  JSON.stringify([
    r.date,
    r.ex,
    r.ifCode,
    r.subject,
    r.department,
    r.forwarding ?? null,
  ]);

@Injectable()
export class RecordsIoService {
  constructor(private readonly prisma: PrismaService) {}

  async export(query: ExportRecordsQuery) {
    const records = await this.prisma.record.findMany({
      where: recordWhere(query),
      include: { createdBy: userRef },
      orderBy: recordOrder,
    });

    return spreadsheetStream(
      query.format,
      EXPORT_COLUMNS,
      records.map((r) => [
        r.date,
        r.ex,
        r.ifCode,
        r.subject,
        r.department,
        r.forwarding,
        r.createdBy.fullName,
      ]),
    );
  }

  /** Header row only: an example row could end up imported. */
  template(format: ExportFormat) {
    return spreadsheetStream(format, [...IMPORT_COLUMNS], []);
  }

  /**
   * Validates the file and, unless `dryRun`, saves every valid row in one
   * transaction. Invalid rows are reported and left out.
   */
  async import(
    file: { originalname: string; buffer: Buffer },
    dryRun: boolean,
    user: AuthenticatedUser,
  ): Promise<ImportReport> {
    const rows = await readSpreadsheet(file.originalname, file.buffer);
    const { totalRows, valid, errors } = await parseImportRows(rows);

    const report = {
      totalRows,
      validCount: valid.length,
      invalidCount: totalRows - valid.length,
      duplicateCount: await this.countDuplicates(valid),
      errors,
    };

    if (dryRun || valid.length === 0) return { ...report, importedCount: 0 };

    await this.insert(valid, user.userId);
    return { ...report, importedCount: valid.length };
  }

  private async countDuplicates(rows: CreateRecordDto[]): Promise<number> {
    const existing = new Set<string>();

    for (const batch of batches([...new Set(rows.map((r) => r.ex))])) {
      const records = await this.prisma.record.findMany({
        where: { deletedAt: null, ex: { in: batch } },
      });
      for (const r of records) {
        existing.add(fingerprint({ ...r, date: toDay(r.date) }));
      }
    }

    return rows.filter((r) => existing.has(fingerprint(r))).length;
  }

  private async insert(rows: CreateRecordDto[], userId: string) {
    const start = Date.now();
    const records = rows.map((row, index) => ({
      id: randomUUID(),
      date: toDateColumn(row.date),
      ex: row.ex,
      ifCode: row.ifCode,
      subject: row.subject,
      department: row.department,
      forwarding: row.forwarding ?? null,
      createdById: userId,
      updatedById: null,
      // One millisecond apart: rows of a same date keep the sheet's order.
      createdAt: new Date(start + index),
      updatedAt: new Date(start + index),
      deletedAt: null,
    }));
    const entries: Prisma.AuditLogCreateManyInput[] = records.map((record) => ({
      recordId: record.id,
      action: AuditAction.CREATE,
      performedById: userId,
      after: toSnapshot(record),
    }));

    await this.prisma.$transaction(
      async (tx) => {
        for (const data of batches(records)) {
          await tx.record.createMany({ data });
        }
        for (const data of batches(entries)) {
          await tx.auditLog.createMany({ data });
        }
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  }
}
