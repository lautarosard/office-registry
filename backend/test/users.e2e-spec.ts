import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  createHarness,
  type Harness,
  type TokenBody,
} from './support/fixtures';

interface UserBody {
  id: string;
  dni: string;
  username: string;
  temporaryPassword: string;
}

const newUser = {
  dni: '45.675.017',
  username: 'jperez',
  fullName: 'Juana Pérez',
  role: 'USER',
};

describe('Users (e2e)', () => {
  let t: Harness;

  beforeAll(async () => {
    t = await createHarness();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.app.close());

  const signedInAdmin = () =>
    t.signedIn({ role: Role.ADMIN, fullName: 'Admin Principal' });

  type Admin = Awaited<ReturnType<typeof signedInAdmin>>;

  const create = async (admin: Admin, overrides: object = {}) => {
    const res = await admin
      .post('/api/users')
      .send({ ...newUser, ...overrides })
      .expect(201);
    return res.body as UserBody;
  };

  it('is closed to a USER', async () => {
    const user = await t.signedIn();
    const target = await t.createUser();

    await user.get('/api/users').expect(403);
    await user.post('/api/users').send(newUser).expect(403);
    await user
      .patch(`/api/users/${target.id}`)
      .send({ role: 'ADMIN' })
      .expect(403);
    await user.post(`/api/users/${target.id}/reset-password`).expect(403);
  });

  it('creates a user with a one-time temporary password', async () => {
    const admin = await signedInAdmin();

    const res = await admin.post('/api/users').send(newUser).expect(201);

    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      id: expect.any(String) as string,
      dni: '45675017',
      username: 'jperez',
      fullName: 'Juana Pérez',
      role: 'USER',
      isActive: true,
      mustChangePassword: true,
      createdAt: expect.any(String) as string,
      temporaryPassword: expect.stringMatching(/^.{12}$/) as string,
    });

    const { temporaryPassword } = res.body as UserBody;
    const login = await t.login('jperez', temporaryPassword).expect(201);
    expect((login.body as TokenBody).mustChangePassword).toBe(true);

    // The password is never readable again.
    const listed = await admin.get('/api/users?q=jperez').expect(200);
    expect(JSON.stringify(listed.body)).not.toMatch(
      /password"|tokenVersion|temporaryPassword/,
    );
  });

  it('validates input and refuses duplicates', async () => {
    const admin = await signedInAdmin();
    await create(admin);
    const post = (body: object) => admin.post('/api/users').send(body);

    for (const body of [
      { ...newUser, dni: '123' },
      { ...newUser, dni: 'abcdefgh' },
      { ...newUser, username: ' ' },
      { ...newUser, fullName: undefined },
      { ...newUser, role: 'SUPERADMIN' },
      { ...newUser, password: 'Elegida123' },
    ]) {
      await post(body).expect(400);
    }

    const sameDni = await post({ ...newUser, username: 'otro' }).expect(409);
    expect(sameDni.body).toMatchObject({
      message: 'Ya existe un usuario con ese DNI.',
    });
    await post({ ...newUser, dni: '30111222', username: 'JPerez' }).expect(409);
  });

  it('does not treat "_" or "%" in a username as wildcards', async () => {
    const admin = await signedInAdmin();
    await create(admin, { username: 'axb' });

    await create(admin, { dni: '30111222', username: 'a_b' });

    const res = await admin.get('/api/users?q=_').expect(200);
    const { data } = res.body as { data: UserBody[] };
    expect(data.every((u) => u.username.includes('_'))).toBe(true);
    expect(data.map((u) => u.username)).toContain('a_b');
  });

  it('searches by DNI, username or name, with pagination', async () => {
    const admin = await signedInAdmin();
    await create(admin);
    await create(admin, {
      dni: '30111222',
      username: 'mgomez',
      fullName: 'Mario Gómez',
    });
    const search = async (query: string) => {
      const res = await admin.get(`/api/users?${query}`).expect(200);
      const { data, meta } = res.body as {
        data: UserBody[];
        meta: { total: number; totalPages: number };
      };
      return { usernames: data.map((u) => u.username), meta };
    };

    expect((await search('q=45.675')).usernames).toEqual(['jperez']);
    expect((await search('q=111222')).usernames).toEqual(['mgomez']);
    expect((await search('q=JPER')).usernames).toEqual(['jperez']);
    expect((await search('q=mario')).usernames).toEqual(['mgomez']);

    const paged = await search('pageSize=2&page=2');
    expect(paged.meta).toMatchObject({ total: 3, totalPages: 2 });
    expect(paged.usernames).toHaveLength(1);
    await admin.get('/api/users?pageSize=101').expect(400);
  });

  it('edits a user', async () => {
    const admin = await signedInAdmin();
    const { id } = await create(admin);
    const other = await create(admin, { dni: '30111222', username: 'mgomez' });

    const res = await admin
      .patch(`/api/users/${id}`)
      .send({
        dni: '28.000.111',
        username: 'jperez2',
        fullName: 'Juana P.',
        role: 'ADMIN',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      dni: '28000111',
      username: 'jperez2',
      fullName: 'Juana P.',
      role: 'ADMIN',
    });

    // Saving its own values again is not a conflict; taking another's is.
    await admin
      .patch(`/api/users/${id}`)
      .send({ dni: '28000111', username: 'JPerez2' })
      .expect(200);
    await admin.patch(`/api/users/${id}`).send({ dni: other.dni }).expect(409);
    await admin.patch(`/api/users/${id}`).send({ role: null }).expect(400);
    await admin
      .patch(`/api/users/${id}`)
      .send({ mustChangePassword: false })
      .expect(400);
    await admin.patch(`/api/users/${randomUUID()}`).send({}).expect(404);
  });

  it('deactivates a user for good: reactivating keeps old sessions dead', async () => {
    const admin = await signedInAdmin();
    const user = await t.signedIn();
    const url = `/api/users/${user.user.id}`;

    await admin.patch(url).send({ isActive: false }).expect(200);
    await user.get('/api/auth/me').expect(401);
    await t.login(user.user.username).expect(401);

    await admin.patch(url).send({ isActive: true }).expect(200);
    await user.get('/api/auth/me').expect(401);
    await t.login(user.user.username).expect(201);
  });

  it('stops an admin from locking themselves out', async () => {
    const admin = await signedInAdmin();
    const url = `/api/users/${admin.user.id}`;

    await admin.patch(url).send({ isActive: false }).expect(403);
    await admin.patch(url).send({ role: 'USER' }).expect(403);
    await admin.post(`${url}/reset-password`).expect(403);
    await admin
      .patch(url)
      .send({ fullName: 'Nuevo Nombre', role: 'ADMIN', isActive: true })
      .expect(200);
  });

  it('resets a password and revokes the open sessions', async () => {
    const admin = await signedInAdmin();
    const user = await t.signedIn();

    const res = await admin
      .post(`/api/users/${user.user.id}/reset-password`)
      .expect(200);

    const { temporaryPassword } = res.body as UserBody;
    expect(res.body).toEqual({ temporaryPassword });
    expect(temporaryPassword).toHaveLength(12);
    await user.get('/api/auth/me').expect(401);
    await t.login(user.user.username).expect(401);
    const login = await t
      .login(user.user.username, temporaryPassword)
      .expect(201);
    expect((login.body as TokenBody).mustChangePassword).toBe(true);
    await t
      .as((login.body as TokenBody).accessToken)
      .get('/api/records')
      .expect(403);

    await admin.post(`/api/users/${randomUUID()}/reset-password`).expect(404);
  });
});
