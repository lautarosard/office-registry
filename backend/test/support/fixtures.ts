import { INestApplication } from '@nestjs/common';
import { Role, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { createTestApp } from './app';

export const PASSWORD = 'Inicial123';

export interface TokenBody {
  accessToken: string;
  mustChangePassword: boolean;
}

export const recordInput = {
  date: '2026-11-26',
  ex: 'EX-2025-93504106- -APN-DIFP#PFA',
  ifCode: 'IF-2025-93911988-APN-SOPDGA#PFA',
  subject: 'Diagramación de servicio',
  department: 'DGO#PFA',
};

/** Test harness: a real app on the test database, plus HTTP helpers. */
export async function createHarness() {
  const app: INestApplication<App> = await createTestApp();
  const prisma = app.get(PrismaService);

  const http = () => request(app.getHttpServer());

  /** An authenticated client for one token. */
  const as = (token: string) => {
    const auth = `Bearer ${token}`;
    return {
      token,
      get: (url: string) => http().get(url).set('Authorization', auth),
      post: (url: string) => http().post(url).set('Authorization', auth),
      patch: (url: string) => http().patch(url).set('Authorization', auth),
      delete: (url: string) => http().delete(url).set('Authorization', auth),
    };
  };

  // TRUNCATE, because the AuditLog trigger rejects DELETE. The database name
  // is guaranteed to end in "_test" (see database-url.ts).
  const reset = () =>
    prisma.$executeRawUnsafe('TRUNCATE "AuditLog", "Record", "User"');

  const createUser = async (overrides: Partial<User> = {}) =>
    prisma.user.create({
      data: {
        dni: String(randomInt(10_000_000, 99_999_999)),
        username: `u_${randomUUID().slice(0, 8)}`,
        fullName: 'Usuario de Prueba',
        password: await bcrypt.hash(PASSWORD, 4),
        role: Role.USER,
        mustChangePassword: false,
        ...overrides,
      },
    });

  const login = (username: string, password = PASSWORD) =>
    http().post('/api/auth/login').send({ username, password });

  const tokenFor = async (username: string, password = PASSWORD) => {
    const res = await login(username, password).expect(201);
    return (res.body as TokenBody).accessToken;
  };

  /** Creates a user and returns it together with its authenticated client. */
  const signedIn = async (overrides: Partial<User> = {}) => {
    const user = await createUser(overrides);
    return { user, ...as(await tokenFor(user.username)) };
  };

  return {
    app,
    prisma,
    http,
    as,
    reset,
    createUser,
    login,
    tokenFor,
    signedIn,
  };
}

export type Harness = Awaited<ReturnType<typeof createHarness>>;
