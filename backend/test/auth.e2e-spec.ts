import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  createHarness,
  PASSWORD,
  recordInput,
  type Harness,
  type TokenBody,
} from './support/fixtures';

const NEW_PASSWORD = 'Definitiva456';

describe('Authentication and sessions (e2e)', () => {
  let t: Harness;

  beforeAll(async () => {
    t = await createHarness();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.app.close());

  const changePassword = (token: string, body: object) =>
    t.as(token).post('/api/auth/change-password').send(body);

  describe('login and profile', () => {
    it('returns a token for valid credentials', async () => {
      const user = await t.createUser();

      const res = await t.login(user.username).expect(201);

      expect(res.body).toEqual({
        accessToken: expect.any(String) as string,
        mustChangePassword: false,
      });
    });

    it('rejects a wrong password and an unknown user alike', async () => {
      const user = await t.createUser();

      await t.login(user.username, 'incorrecta1').expect(401);
      await t.login('nadie').expect(401);
    });

    it('GET /api/auth/me returns the profile without secrets', async () => {
      const admin = await t.signedIn({ role: Role.ADMIN });

      const res = await admin.get('/api/auth/me').expect(200);

      expect(res.body).toEqual({
        id: admin.user.id,
        username: admin.user.username,
        fullName: admin.user.fullName,
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      });
    });

    it('rejects a missing or forged token', async () => {
      await t.http().get('/api/auth/me').expect(401);
      await t.as('not.a.token').get('/api/auth/me').expect(401);
    });
  });

  describe('forced password change', () => {
    it('blocks protected routes until the password change succeeds', async () => {
      const admin = await t.createUser({
        role: Role.ADMIN,
        mustChangePassword: true,
      });
      const res = await t.login(admin.username).expect(201);
      const { accessToken, mustChangePassword } = res.body as TokenBody;
      const pending = t.as(accessToken);
      expect(mustChangePassword).toBe(true);

      await pending.get('/api/auth/me').expect(200);
      const blocked = await pending.get('/api/records').expect(403);
      expect(blocked.body).toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });
      await pending.post('/api/records').send(recordInput).expect(403);
      await pending.get('/api/users').expect(403);

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
      await pending.get('/api/records').expect(403);

      const changed = await changePassword(accessToken, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);
      const fresh = changed.body as TokenBody;
      expect(fresh.mustChangePassword).toBe(false);

      await t.as(fresh.accessToken).get('/api/records').expect(200);
      await t.login(admin.username).expect(401);
      await t.login(admin.username, NEW_PASSWORD).expect(201);
    });
  });

  describe('revocation', () => {
    it('signs out every other session when the password changes', async () => {
      const user = await t.createUser();
      const thisPc = await t.tokenFor(user.username);
      const otherPc = await t.tokenFor(user.username);

      const res = await changePassword(thisPc, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(200);

      await t.as(otherPc).get('/api/auth/me').expect(401);
      await t.as(thisPc).get('/api/auth/me').expect(401);
      await t
        .as((res.body as TokenBody).accessToken)
        .get('/api/auth/me')
        .expect(200);
      expect(
        await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
      ).toMatchObject({ tokenVersion: 1 });
    });

    it('rejects the token and login of a deactivated user', async () => {
      const user = await t.signedIn();
      await user.get('/api/records').expect(200);

      await t.prisma.user.update({
        where: { id: user.user.id },
        data: { isActive: false },
      });

      await user.get('/api/records').expect(401);
      await user.get('/api/auth/me').expect(401);
      await changePassword(user.token, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(401);
      await t.login(user.user.username).expect(401);
    });

    it('rejects the token of a user that no longer exists', async () => {
      const user = await t.signedIn();

      await t.prisma.user.delete({ where: { id: user.user.id } });

      await user.get('/api/auth/me').expect(401);
    });

    it('applies a role change without a new login', async () => {
      const admin = await t.signedIn({ role: Role.ADMIN });
      await admin.get('/api/users').expect(200);

      await t.prisma.user.update({
        where: { id: admin.user.id },
        data: { role: Role.USER },
      });

      await admin.get('/api/users').expect(403);
    });
  });

  it('requires authentication on every records and users route', async () => {
    const id = randomUUID();
    const http = () => t.http();

    await http().get('/api/records').expect(401);
    await http().get(`/api/records/${id}`).expect(401);
    await http().get(`/api/records/${id}/audit`).expect(401);
    await http().post('/api/records').send(recordInput).expect(401);
    await http().patch(`/api/records/${id}`).send({}).expect(401);
    await http().delete(`/api/records/${id}`).expect(401);
    await http().get('/api/users').expect(401);
    await http().post('/api/users').send({}).expect(401);
    await http().patch(`/api/users/${id}`).send({}).expect(401);
    await http().post(`/api/users/${id}/reset-password`).expect(401);
  });
});
