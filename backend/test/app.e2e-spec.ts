import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestApp } from './support/app';

const PASSWORD = 'Inicial123';
const NEW_PASSWORD = 'Definitiva456';

interface TokenBody {
  accessToken: string;
  mustChangePassword: boolean;
}

interface RecordBody {
  id: string;
  user_id: string;
  motivo: string;
}

const recordPayload = {
  ex: 'EX-2025-93504106- -APN-DIFP#PFA',
  if_code: 'IF-2025-93911988-APN-SOPDGA#PFA',
  motivo: 'Diagramación de servicio',
  reparticion: 'DGO#PFA',
  pase: 'DGA#PFA',
  dia: '2026-11-26T12:00:00Z',
};

describe('Core security (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.register.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => `Bearer ${token}`;

  async function createUser(
    overrides: {
      role?: Role;
      mustChangePassword?: boolean;
      isActive?: boolean;
    } = {},
  ) {
    return prisma.user.create({
      data: {
        username: `u_${randomUUID().slice(0, 8)}`,
        name: 'Usuario de Prueba',
        password: await bcrypt.hash(PASSWORD, 4),
        role: Role.USER,
        mustChangePassword: false,
        ...overrides,
      },
    });
  }

  const login = (username: string, password = PASSWORD) =>
    http().post('/api/auth/login').send({ username, password });

  async function tokenFor(username: string): Promise<string> {
    const res = await login(username).expect(201);
    return (res.body as TokenBody).accessToken;
  }

  const changePassword = (token: string, body: object) =>
    http()
      .post('/api/auth/change-password')
      .set('Authorization', bearer(token))
      .send(body);

  describe('login and session', () => {
    it('returns a token for valid credentials', async () => {
      const user = await createUser();

      const res = await login(user.username).expect(201);

      expect(res.body).toEqual({
        accessToken: expect.any(String) as string,
        mustChangePassword: false,
      });
    });

    it('rejects a wrong password and an unknown user alike', async () => {
      const user = await createUser();

      await login(user.username, 'incorrecta1').expect(401);
      await login('nadie').expect(401);
    });

    it('GET /api/auth/me returns the profile without the password', async () => {
      const user = await createUser({ role: Role.ADMIN });
      const token = await tokenFor(user.username);

      const res = await http()
        .get('/api/auth/me')
        .set('Authorization', bearer(token))
        .expect(200);

      expect(res.body).toEqual({
        id: user.id,
        username: user.username,
        name: user.name,
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      });
    });

    it('rejects a missing or forged token', async () => {
      await http().get('/api/auth/me').expect(401);
      await http()
        .get('/api/auth/me')
        .set('Authorization', bearer('not.a.token'))
        .expect(401);
    });
  });

  describe('forced password change', () => {
    it('blocks protected routes until the password change succeeds', async () => {
      const admin = await createUser({
        role: Role.ADMIN,
        mustChangePassword: true,
      });
      const res = await login(admin.username).expect(201);
      const { accessToken, mustChangePassword } = res.body as TokenBody;
      expect(mustChangePassword).toBe(true);

      // Allowed while pending.
      await http()
        .get('/api/auth/me')
        .set('Authorization', bearer(accessToken))
        .expect(200);

      // Everything else is blocked, including admin routes.
      const blocked = await http()
        .get('/api/records')
        .set('Authorization', bearer(accessToken))
        .expect(403);
      expect(blocked.body).toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });
      await http()
        .post('/api/records')
        .set('Authorization', bearer(accessToken))
        .send(recordPayload)
        .expect(403);
      await http()
        .post('/api/users')
        .set('Authorization', bearer(accessToken))
        .send({ username: 'otro', name: 'Otro', role: 'USER' })
        .expect(403);

      // Failed attempts leave the account restricted.
      await changePassword(accessToken, {
        currentPassword: 'incorrecta1',
        newPassword: NEW_PASSWORD,
      }).expect(400);
      for (const newPassword of [
        'corta1',
        'sololetras',
        '1234567890',
        `a1${'ñ'.repeat(36)}`, // 74 bytes: past the bcrypt limit
        PASSWORD, // same as the current one
      ]) {
        await changePassword(accessToken, {
          currentPassword: PASSWORD,
          newPassword,
        }).expect(400);
      }
      await http()
        .get('/api/records')
        .set('Authorization', bearer(accessToken))
        .expect(403);

      const changed = await changePassword(accessToken, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);
      const fresh = changed.body as TokenBody;
      expect(fresh.mustChangePassword).toBe(false);

      await http()
        .get('/api/records')
        .set('Authorization', bearer(fresh.accessToken))
        .expect(200);

      // The token issued for the temporary password stays restricted.
      await http()
        .get('/api/records')
        .set('Authorization', bearer(accessToken))
        .expect(403);

      await login(admin.username).expect(401);
      await login(admin.username, NEW_PASSWORD).expect(201);
    });

    it('applies a later reset to tokens already issued', async () => {
      const user = await createUser();
      const token = await tokenFor(user.username);

      await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true },
      });

      await http()
        .get('/api/records')
        .set('Authorization', bearer(token))
        .expect(403);
    });
  });

  describe('immediate revocation', () => {
    it('rejects the token and the login of a deactivated user', async () => {
      const user = await createUser();
      const token = await tokenFor(user.username);
      await http()
        .get('/api/records')
        .set('Authorization', bearer(token))
        .expect(200);

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      for (const path of ['/api/records', '/api/auth/me']) {
        await http().get(path).set('Authorization', bearer(token)).expect(401);
      }
      await changePassword(token, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(401);
      await login(user.username).expect(401);
    });

    it('rejects the token of a user that no longer exists', async () => {
      const user = await createUser();
      const token = await tokenFor(user.username);

      await prisma.user.delete({ where: { id: user.id } });

      await http()
        .get('/api/auth/me')
        .set('Authorization', bearer(token))
        .expect(401);
    });

    it('applies a role change without a new login', async () => {
      const user = await createUser({ role: Role.ADMIN });
      const token = await tokenFor(user.username);

      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.USER },
      });

      await http()
        .post('/api/users')
        .set('Authorization', bearer(token))
        .send({ username: 'otro', name: 'Otro', role: 'USER' })
        .expect(403);
    });
  });

  describe('/api/records', () => {
    it('requires authentication on every endpoint', async () => {
      const id = randomUUID();

      await http().get('/api/records').expect(401);
      await http().get(`/api/records/${id}`).expect(401);
      await http().post('/api/records').send(recordPayload).expect(401);
      await http().put(`/api/records/${id}`).send({}).expect(401);
      await http().delete(`/api/records/${id}`).expect(401);
    });

    it('binds the author to the JWT user', async () => {
      const author = await createUser();
      const token = await tokenFor(author.username);

      const res = await http()
        .post('/api/records')
        .set('Authorization', bearer(token))
        .send(recordPayload)
        .expect(201);

      const body = res.body as RecordBody;
      expect(body.user_id).toBe(author.id);
      const stored = await prisma.register.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(stored.user_id).toBe(author.id);
    });

    it('rejects a client-supplied author on create and update', async () => {
      const author = await createUser();
      const victim = await createUser();
      const token = await tokenFor(author.username);

      await http()
        .post('/api/records')
        .set('Authorization', bearer(token))
        .send({ ...recordPayload, user_id: victim.id })
        .expect(400);
      expect(await prisma.register.count()).toBe(0);

      const created = await http()
        .post('/api/records')
        .set('Authorization', bearer(token))
        .send(recordPayload)
        .expect(201);
      await http()
        .put(`/api/records/${(created.body as RecordBody).id}`)
        .set('Authorization', bearer(token))
        .send({ user_id: victim.id })
        .expect(400);
    });

    it('keeps the original author when a record is updated', async () => {
      const author = await createUser();
      const editor = await createUser({ role: Role.ADMIN });
      const created = await http()
        .post('/api/records')
        .set('Authorization', bearer(await tokenFor(author.username)))
        .send(recordPayload)
        .expect(201);

      const updated = await http()
        .put(`/api/records/${(created.body as RecordBody).id}`)
        .set('Authorization', bearer(await tokenFor(editor.username)))
        .send({ motivo: 'Corregido' })
        .expect(200);

      expect(updated.body).toMatchObject({
        motivo: 'Corregido',
        user_id: author.id,
      });
    });

    it('returns 404 for a record that does not exist', async () => {
      const user = await createUser();

      await http()
        .get(`/api/records/${randomUUID()}`)
        .set('Authorization', bearer(await tokenFor(user.username)))
        .expect(404);
    });
  });
});
