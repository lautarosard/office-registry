import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * E2E tests write and delete data, so they use their own database:
 * TEST_DATABASE_URL, or DATABASE_URL with "_test" appended to the name.
 */
export function testDatabaseUrl(): string {
  config({ path: resolve(__dirname, '../../.env'), quiet: true });

  const source = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!source) {
    throw new Error('Set DATABASE_URL (or TEST_DATABASE_URL) for e2e tests.');
  }

  const url = new URL(source);
  if (!url.pathname.endsWith('_test')) {
    if (process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL must name a database ending "_test".');
    }
    url.pathname = `${url.pathname}_test`;
  }

  return url.toString();
}
