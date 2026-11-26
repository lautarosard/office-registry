// Must stay first: sets NODE_ENV and the throttle limit before AppModule loads.
import './support/production-env';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './support/app';

describe('HTTP hardening, production mode (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not serve Swagger', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });

  it('sends the helmet security headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');

    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rate-limits login attempts', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'nadie', password: 'incorrecta1' });

    for (let i = 0; i < 3; i++) {
      await attempt().expect(401);
    }

    const res = await attempt().expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
