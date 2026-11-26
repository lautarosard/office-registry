import { Role } from '@prisma/client';
import { readSheet } from 'read-excel-file/node';
import type { Response } from 'supertest';
import writeXlsxFile from 'write-excel-file/node';
import type { ImportReport } from '../src/modules/records/records-io.service';
import { createHarness, recordInput, type Harness } from './support/fixtures';

const HEADER = 'Fecha;EX;IF;Motivo;Repartición;Pase';
const csv = (...rows: string[]) =>
  Buffer.from([HEADER, ...rows].join('\r\n'), 'utf8');

const GOOD_1 = '05/03/2026;ex-2026-1-apn;if-2026-1-apn;Primera;DGO#PFA;---';
const GOOD_2 = '2026-03-05;EX-2026-2-APN;IF-2026-2-APN;Segunda;DGA#PFA;Archivo';
const BAD = '31/02/2026;;XX-1;Mala;DGO#PFA;';

/** supertest doesn't buffer unknown binary types by itself. */
const binary = (
  res: Response,
  done: (err: Error | null, body: Buffer) => void,
) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('Catalogs, export and import (e2e)', () => {
  let t: Harness;

  beforeAll(async () => {
    t = await createHarness();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.app.close());

  const signedInAdmin = () =>
    t.signedIn({ role: Role.ADMIN, fullName: 'Admin Principal' });
  type Client = Awaited<ReturnType<typeof signedInAdmin>>;

  const create = async (client: Client, overrides: object = {}) => {
    const res = await client
      .post('/api/records')
      .send({ ...recordInput, ...overrides })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const upload = (
    client: Client,
    content: Buffer,
    { name = 'planilla.csv', dryRun = false } = {},
  ) =>
    client
      .post(`/api/records/import${dryRun ? '?dryRun=true' : ''}`)
      .attach('file', content, name);

  const download = async (client: Client, url: string) => {
    const res = await client.get(url).buffer(true).parse(binary).expect(200);
    return { body: res.body as Buffer, headers: res.headers };
  };

  describe('GET /api/records/catalogs', () => {
    it('returns distinct values of active records, most used first', async () => {
      const user = await t.signedIn();
      await create(user, { subject: 'Zeta', forwarding: 'DGA#PFA' });
      await create(user, { subject: 'Alfa' });
      await create(user, { subject: 'Beta' });
      await create(user, { subject: 'Beta' });
      const deleted = await create(user, {
        subject: 'Borrado',
        department: 'X',
        forwarding: 'Y',
      });
      await user.delete(`/api/records/${deleted}`).expect(204);

      const res = await user.get('/api/records/catalogs').expect(200);

      expect(res.body).toEqual({
        subjects: ['Beta', 'Alfa', 'Zeta'],
        departments: ['DGO#PFA'],
        forwardings: ['DGA#PFA'],
      });
    });

    it('requires authentication', async () => {
      await t.http().get('/api/records/catalogs').expect(401);
    });
  });

  describe('admin only', () => {
    it('refuses a USER and anonymous requests', async () => {
      const user = await t.signedIn();

      await user.get('/api/records/export').expect(403);
      await user.get('/api/records/import-template').expect(403);
      await upload(user, csv(GOOD_1)).expect(403);
      await upload(user, csv(GOOD_1), { dryRun: true }).expect(403);
      await t.http().get('/api/records/export').expect(401);
      await t.http().post('/api/records/import').expect(401);
      expect(await t.prisma.record.count()).toBe(0);
    });
  });

  describe('GET /api/records/export', () => {
    it('writes an xlsx with Spanish headers, real dates and the filters', async () => {
      const admin = await signedInAdmin();
      await create(admin, { date: '2026-01-10', subject: 'Enero' });
      await create(admin, { date: '2026-02-10', subject: 'Febrero' });
      await create(admin, { date: '2026-03-10', subject: 'Marzo' });
      const gone = await create(admin, { date: '2026-02-11' });
      await admin.delete(`/api/records/${gone}`).expect(204);

      const { body, headers } = await download(
        admin,
        '/api/records/export?from=2026-02-01',
      );

      expect(headers['content-type']).toContain('spreadsheetml');
      expect(headers['content-disposition']).toMatch(
        /attachment; filename="expedientes_\d{4}-\d{2}-\d{2}\.xlsx"/,
      );
      expect(await readSheet(body)).toEqual([
        ['Fecha', 'EX', 'IF', 'Motivo', 'Repartición', 'Pase', 'Cargado por'],
        [
          new Date('2026-03-10T00:00:00.000Z'),
          recordInput.ex,
          recordInput.ifCode,
          'Marzo',
          'DGO#PFA',
          null,
          'Admin Principal',
        ],
        expect.arrayContaining(['Febrero']) as unknown[],
      ]);

      const filtered = await download(admin, '/api/records/export?q=enero');
      expect(await readSheet(filtered.body)).toHaveLength(2);
    });

    it('writes a csv with dd/mm/yyyy dates and no live formulas', async () => {
      const admin = await signedInAdmin();
      await create(admin, {
        date: '2026-03-05',
        subject: '=1+1; "cita"',
        forwarding: 'Archivo',
      });

      const { body, headers } = await download(
        admin,
        '/api/records/export?format=csv',
      );

      expect(headers['content-type']).toContain('text/csv');
      expect(body.toString('utf8')).toBe(
        '\uFEFFFecha;EX;IF;Motivo;Repartición;Pase;Cargado por\r\n' +
          `05/03/2026;${recordInput.ex};${recordInput.ifCode};` +
          `"'=1+1; ""cita""";DGO#PFA;Archivo;Admin Principal\r\n`,
      );
    });

    it('rejects an unknown format or pagination parameters', async () => {
      const admin = await signedInAdmin();

      await admin.get('/api/records/export?format=pdf').expect(400);
      await admin.get('/api/records/export?page=2').expect(400);
      await admin.get('/api/records/export?from=ayer').expect(400);
    });

    it.each(['csv', 'xlsx'])(
      'produces a %s file that imports back unchanged',
      async (format) => {
        const admin = await signedInAdmin();
        await create(admin, { subject: '-5 grados', forwarding: 'DGA#PFA' });
        const { body } = await download(
          admin,
          `/api/records/export?format=${format}`,
        );

        const res = await upload(admin, body, {
          name: `copia.${format}`,
          dryRun: true,
        }).expect(200);

        // Recognized as identical to the stored record.
        expect(res.body).toMatchObject({
          validCount: 1,
          invalidCount: 0,
          duplicateCount: 1,
        });
      },
    );
  });

  describe('POST /api/records/import', () => {
    it('reports row errors on a dry run and saves nothing', async () => {
      const admin = await signedInAdmin();

      const res = await upload(admin, csv(GOOD_1, BAD, GOOD_2), {
        dryRun: true,
      }).expect(200);

      const report = res.body as ImportReport;
      expect(report).toMatchObject({
        totalRows: 3,
        validCount: 2,
        invalidCount: 1,
        duplicateCount: 0,
        importedCount: 0,
      });
      expect(report.errors.map((e) => [e.row, e.field])).toEqual([
        [3, 'date'],
        [3, 'ex'],
        [3, 'ifCode'],
      ]);
      expect(await t.prisma.record.count()).toBe(0);
      expect(await t.prisma.auditLog.count()).toBe(0);
    });

    it('imports the valid rows with audit entries, as the admin', async () => {
      const admin = await signedInAdmin();

      const res = await upload(admin, csv(GOOD_1, BAD, GOOD_2)).expect(200);

      expect(res.body).toMatchObject({ importedCount: 2, invalidCount: 1 });
      const records = await t.prisma.record.findMany({
        include: { auditLogs: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(records).toHaveLength(2);
      expect(records[0]).toMatchObject({
        ex: 'EX-2026-1-APN',
        ifCode: 'IF-2026-1-APN',
        forwarding: null,
        createdById: admin.user.id,
        date: new Date('2026-03-05T00:00:00.000Z'),
      });
      expect(records[1].forwarding).toBe('Archivo');
      for (const record of records) {
        expect(record.auditLogs).toEqual([
          expect.objectContaining({
            action: 'CREATE',
            performedById: admin.user.id,
            before: null,
            after: expect.objectContaining({
              ex: record.ex,
              date: '2026-03-05',
              createdById: admin.user.id,
              deletedAt: null,
            }) as object,
          }),
        ]);
      }
      // Later rows of the same date are listed first, as newer movements.
      const list = await admin.get('/api/records').expect(200);
      expect(
        (list.body as { data: { subject: string }[] }).data.map(
          (r) => r.subject,
        ),
      ).toEqual(['Segunda', 'Primera']);
    });

    it('warns about rows that are already stored', async () => {
      const admin = await signedInAdmin();
      await upload(admin, csv(GOOD_1)).expect(200);

      const res = await upload(admin, csv(GOOD_1, GOOD_2), {
        dryRun: true,
      }).expect(200);

      expect(res.body).toMatchObject({ validCount: 2, duplicateCount: 1 });
    });

    it('reads an xlsx with date cells', async () => {
      const admin = await signedInAdmin();
      const text = (value: string) => ({ value, type: String });
      const file = await writeXlsxFile([
        ['FECHA', 'EX', 'IF', 'MOTIVO', 'REPARTICION'].map(text),
        [
          {
            value: new Date('2025-12-31T00:00:00.000Z'),
            type: Date,
            format: 'dd/mm/yyyy',
          },
          text('EX-2025-1-APN'),
          text('IF-2025-1-APN'),
          text('Desde Excel'),
          text('DGO#PFA'),
        ],
      ]).toBuffer();

      const res = await upload(admin, file, { name: 'Planilla.XLSX' }).expect(
        200,
      );

      expect(res.body).toMatchObject({ importedCount: 1, errors: [] });
      expect(await t.prisma.record.findFirst()).toMatchObject({
        date: new Date('2025-12-31T00:00:00.000Z'),
        forwarding: null,
      });
    });

    it('saves nothing when no row is valid', async () => {
      const admin = await signedInAdmin();

      const res = await upload(admin, csv(BAD)).expect(200);

      expect(res.body).toMatchObject({ validCount: 0, importedCount: 0 });
      expect(await t.prisma.record.count()).toBe(0);
    });

    it('imports more rows than fit in one INSERT, all or nothing', async () => {
      const admin = await signedInAdmin();
      const rows = Array.from(
        { length: 2500 },
        (_, i) => `05/03/2026;EX-2026-${i}-A;IF-2026-${i}-A;Nota;DGO;`,
      );

      const res = await upload(admin, csv(...rows)).expect(200);

      expect(res.body).toMatchObject({ importedCount: 2500 });
      expect(await t.prisma.record.count()).toBe(2500);
      expect(await t.prisma.auditLog.count()).toBe(2500);
    });

    it('rejects unreadable, oversized or incomplete files', async () => {
      const admin = await signedInAdmin();
      const message = async (content: Buffer, name: string, status = 400) => {
        const res = await upload(admin, content, { name }).expect(status);
        return (res.body as { message: string }).message;
      };

      expect(await message(Buffer.from('x'), 'a.pdf')).toContain('admitido');
      expect(await message(Buffer.from('x'), 'a.xlsx')).toContain('leer');
      expect(await message(Buffer.from('Fecha;EX\r\n1;2'), 'a.csv')).toContain(
        'Faltan columnas',
      );
      expect(
        await message(Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), 'a.csv', 413),
      ).toContain('5 MB');
      await admin.post('/api/records/import').expect(400);
      await upload(admin, csv(GOOD_1)).query({ dryRun: 'quizás' }).expect(400);
      expect(await t.prisma.record.count()).toBe(0);
    });

    it('offers an empty template that has the right columns', async () => {
      const admin = await signedInAdmin();

      const xlsx = await download(admin, '/api/records/import-template');
      expect(await readSheet(xlsx.body)).toEqual([
        ['Fecha', 'EX', 'IF', 'Motivo', 'Repartición', 'Pase'],
      ]);
      const text = await download(
        admin,
        '/api/records/import-template?format=csv',
      );
      expect(text.body.toString('utf8')).toBe(`\uFEFF${HEADER}\r\n`);
    });
  });
});
