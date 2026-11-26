import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createHarness, recordInput, type Harness } from './support/fixtures';

interface RecordBody {
  id: string;
  date: string;
  ex: string;
  forwarding: string | null;
  createdBy: { id: string };
  updatedBy: { id: string } | null;
}

interface ListBody {
  data: RecordBody[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface AuditBody {
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  performedBy: { id: string; username: string; fullName: string };
}

describe('Records (e2e)', () => {
  let t: Harness;

  beforeAll(async () => {
    t = await createHarness();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.app.close());

  type Client = Awaited<ReturnType<Harness['signedIn']>>;

  const create = async (client: Client, overrides: object = {}) => {
    const res = await client
      .post('/api/records')
      .send({ ...recordInput, ...overrides })
      .expect(201);
    return res.body as RecordBody;
  };

  const list = async (client: Client, query: Record<string, string> = {}) => {
    const res = await client.get('/api/records').query(query).expect(200);
    return res.body as ListBody;
  };

  const history = async (client: Client, id: string) => {
    const res = await client.get(`/api/records/${id}/audit`).expect(200);
    return res.body as AuditBody[];
  };

  describe('create', () => {
    it('normalizes input and binds the author from the token', async () => {
      const author = await t.signedIn();

      const record = await create(author, {
        ex: '  ex-2025-93504106- -apn-difp#pfa ',
        ifCode: 'if-2025-93911988-apn-sopdga#pfa',
        forwarding: '  ',
      });

      expect(record).toEqual({
        id: expect.any(String) as string,
        date: '2026-11-26',
        ex: 'EX-2025-93504106- -APN-DIFP#PFA',
        ifCode: 'IF-2025-93911988-APN-SOPDGA#PFA',
        subject: 'Diagramación de servicio',
        department: 'DGO#PFA',
        forwarding: null,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        createdBy: {
          id: author.user.id,
          username: author.user.username,
          fullName: author.user.fullName,
        },
        updatedBy: null,
      });
    });

    it('accepts the same EX more than once', async () => {
      const author = await t.signedIn();

      await create(author);
      await create(author, { ifCode: 'IF-2025-2-APN#PFA' });

      expect((await list(author)).meta.total).toBe(2);
    });

    it('rejects missing, malformed and server-owned fields', async () => {
      const author = await t.signedIn();
      const post = (body: object) => author.post('/api/records').send(body);

      for (const field of Object.keys(recordInput)) {
        await post({ ...recordInput, [field]: undefined }).expect(400);
      }
      await post({ ...recordInput, date: '2026-02-30' }).expect(400);
      await post({ ...recordInput, ex: 'IF-2025-1-APN' }).expect(400);
      await post({ ...recordInput, ifCode: 'cualquiera' }).expect(400);
      await post({ ...recordInput, subject: '   ' }).expect(400);
      for (const field of ['createdById', 'updatedById', 'deletedAt']) {
        await post({ ...recordInput, [field]: author.user.id }).expect(400);
      }
      expect(await t.prisma.record.count()).toBe(0);
      expect(await t.prisma.auditLog.count()).toBe(0);
    });
  });

  describe('search', () => {
    it('matches q in every text field, ignoring case', async () => {
      const user = await t.signedIn();
      await create(user, {
        ex: 'EX-2025-111-APN',
        ifCode: 'IF-2025-222-APN',
        subject: 'Licencia anual',
        department: 'DAL#PFA',
        forwarding: 'Archivo Central',
      });
      await create(user);

      for (const q of ['-111-', '-222-', 'LICENCIA', 'dal#', 'archivo cen']) {
        expect((await list(user, { q })).meta.total).toBe(1);
      }
      expect((await list(user, { q: 'apn' })).meta.total).toBe(2);
      expect((await list(user, { q: 'inexistente' })).meta.total).toBe(0);
    });

    it('treats LIKE wildcards literally', async () => {
      const user = await t.signedIn();
      await create(user, { subject: 'Avance 100% completo' });
      await create(user, { subject: 'Nota_final' });
      await create(user);

      expect((await list(user, { q: '%' })).meta.total).toBe(1);
      expect((await list(user, { q: '_' })).meta.total).toBe(1);
    });

    it('filters by an inclusive date range', async () => {
      const user = await t.signedIn();
      for (const date of ['2026-01-31', '2026-02-01', '2026-02-28']) {
        await create(user, { date });
      }
      const dates = async (query: Record<string, string>) =>
        (await list(user, query)).data.map((r) => r.date);

      expect(await dates({ from: '2026-02-01' })).toEqual([
        '2026-02-28',
        '2026-02-01',
      ]);
      expect(await dates({ to: '2026-02-01' })).toEqual([
        '2026-02-01',
        '2026-01-31',
      ]);
      expect(await dates({ from: '2026-02-01', to: '2026-02-01' })).toEqual([
        '2026-02-01',
      ]);
    });

    it('paginates, newest date first and then newest created', async () => {
      const user = await t.signedIn();
      const older = await create(user, { date: '2026-03-01' });
      const first = await create(user, { date: '2026-03-02' });
      const second = await create(user, { date: '2026-03-02' });

      const page1 = await list(user, { pageSize: '2' });
      const page2 = await list(user, { pageSize: '2', page: '2' });

      expect(page1.meta).toEqual({
        total: 3,
        page: 1,
        pageSize: 2,
        totalPages: 2,
      });
      expect(page1.data.map((r) => r.id)).toEqual([second.id, first.id]);
      expect(page2.data.map((r) => r.id)).toEqual([older.id]);
      expect((await list(user)).meta).toMatchObject({ page: 1, pageSize: 20 });
    });

    it('rejects invalid query parameters', async () => {
      const user = await t.signedIn();

      await user.get('/api/records?pageSize=100').expect(200);
      for (const query of [
        'pageSize=101',
        'pageSize=0',
        'page=0',
        'page=abc',
        'from=ayer',
        'to=2026-02-30',
        'unknown=1',
      ]) {
        await user.get(`/api/records?${query}`).expect(400);
      }
    });
  });

  describe('ownership', () => {
    it('lets a USER change only their own records', async () => {
      const owner = await t.signedIn();
      const other = await t.signedIn();
      const { id } = await create(owner);

      // Everyone can read.
      await other.get(`/api/records/${id}`).expect(200);
      await history(other, id);

      await other
        .patch(`/api/records/${id}`)
        .send({ subject: 'Ajeno' })
        .expect(403);
      await other.delete(`/api/records/${id}`).expect(403);
      expect(
        await t.prisma.record.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({ subject: recordInput.subject, deletedAt: null });
      expect(await t.prisma.auditLog.count()).toBe(1);

      await owner
        .patch(`/api/records/${id}`)
        .send({ subject: 'Propio' })
        .expect(200);
      await owner.delete(`/api/records/${id}`).expect(204);
    });

    it('lets an ADMIN change any record without taking authorship', async () => {
      const owner = await t.signedIn();
      const admin = await t.signedIn({ role: Role.ADMIN });
      const { id } = await create(owner);

      const res = await admin
        .patch(`/api/records/${id}`)
        .send({ subject: 'Corregido' })
        .expect(200);

      expect(res.body).toMatchObject({
        createdBy: { id: owner.user.id },
        updatedBy: { id: admin.user.id },
      });
      await admin.delete(`/api/records/${id}`).expect(204);
    });
  });

  describe('update', () => {
    it('normalizes, clears forwarding and audits before and after', async () => {
      const user = await t.signedIn();
      const { id } = await create(user, { forwarding: 'DGA#PFA' });

      const res = await user
        .patch(`/api/records/${id}`)
        .send({ ex: ' ex-2026-9-apn ', forwarding: '', date: '2026-12-01' })
        .expect(200);

      expect(res.body).toMatchObject({
        ex: 'EX-2026-9-APN',
        forwarding: null,
        date: '2026-12-01',
        subject: recordInput.subject,
      });
      const [, update] = await history(user, id);
      expect(update).toMatchObject({
        action: 'UPDATE',
        before: {
          ex: recordInput.ex,
          forwarding: 'DGA#PFA',
          date: '2026-11-26',
          updatedById: null,
        },
        after: {
          ex: 'EX-2026-9-APN',
          forwarding: null,
          date: '2026-12-01',
          updatedById: user.user.id,
        },
      });
    });

    it('rejects null or blank required fields and a client author', async () => {
      const user = await t.signedIn();
      const { id } = await create(user);

      for (const body of [
        { ex: null },
        { date: null },
        { department: ' ' },
        { ifCode: 'x' },
        { createdById: randomUUID() },
      ]) {
        await user.patch(`/api/records/${id}`).send(body).expect(400);
      }
    });

    it('does not audit a request that changes nothing', async () => {
      const user = await t.signedIn();
      const record = await create(user);

      const res = await user
        .patch(`/api/records/${record.id}`)
        .send({ ...recordInput, ex: recordInput.ex.toLowerCase() })
        .expect(200);

      expect(res.body).toMatchObject({ updatedBy: null });
      expect(await history(user, record.id)).toHaveLength(1);
    });

    it('keeps the audit chain consistent under concurrent edits', async () => {
      const user = await t.signedIn();
      const { id } = await create(user);

      await Promise.all(
        ['A', 'B', 'C', 'D'].map((subject) =>
          user.patch(`/api/records/${id}`).send({ subject }).expect(200),
        ),
      );

      const updates = (await history(user, id)).slice(1);
      const befores = updates.map((e) => e.before?.subject).sort();
      const afters = updates.map((e) => e.after?.subject);
      const final = await t.prisma.record.findUniqueOrThrow({ where: { id } });
      // Each edit saw the previous one: original + every result but the last.
      expect(befores).toEqual(
        [
          recordInput.subject,
          ...afters.filter((s) => s !== final.subject),
        ].sort(),
      );
    });
  });

  describe('soft delete and history', () => {
    it('hides the record but keeps the row and its history', async () => {
      const user = await t.signedIn();
      const admin = await t.signedIn({ role: Role.ADMIN });
      const { id } = await create(user);

      await user.delete(`/api/records/${id}`).expect(204);

      expect((await list(user)).meta.total).toBe(0);
      expect((await list(admin)).meta.total).toBe(0);
      await user.get(`/api/records/${id}`).expect(404);
      await admin.patch(`/api/records/${id}`).send({}).expect(404);
      await admin.delete(`/api/records/${id}`).expect(404);

      const row = await t.prisma.record.findUniqueOrThrow({ where: { id } });
      expect(row.deletedAt).toBeInstanceOf(Date);
      expect(row.updatedById).toBe(user.user.id);

      // Only an ADMIN can consult the history of a deleted record.
      await user.get(`/api/records/${id}/audit`).expect(404);
      const entries = await history(admin, id);
      expect(entries.map((e) => e.action)).toEqual(['CREATE', 'DELETE']);
      expect(entries[0]).toMatchObject({
        before: null,
        performedBy: {
          id: user.user.id,
          username: user.user.username,
          fullName: user.user.fullName,
        },
      });
      expect(entries[1].before?.deletedAt).toBeNull();
      expect(entries[1].after?.deletedAt).toEqual(expect.any(String));
    });

    it('does not allow audit entries to be changed or removed', async () => {
      const user = await t.signedIn();
      await create(user);

      await expect(t.prisma.auditLog.deleteMany()).rejects.toThrow(/immutable/);
      await expect(
        t.prisma.auditLog.updateMany({ data: { action: 'DELETE' } }),
      ).rejects.toThrow(/immutable/);
    });

    it('returns 404 for an unknown record', async () => {
      const user = await t.signedIn();
      const id = randomUUID();

      await user.get(`/api/records/${id}`).expect(404);
      await user.get(`/api/records/${id}/audit`).expect(404);
      await user.patch(`/api/records/${id}`).send({}).expect(404);
      await user.delete(`/api/records/${id}`).expect(404);
    });
  });
});
