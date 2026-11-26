import { execSync } from 'child_process';
import { resolve } from 'path';
import { testDatabaseUrl } from './database-url';

/** Creates the test database if needed and applies the real migrations. */
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
