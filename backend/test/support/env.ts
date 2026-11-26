import { testDatabaseUrl } from './database-url';

// Runs before each spec file is imported, so ConfigModule sees these values.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'e2e-only-secret-not-used-anywhere-else';
process.env.JWT_EXPIRES_IN = '1h';
// High enough not to interfere; hardening.e2e-spec.ts lowers it.
process.env.LOGIN_THROTTLE_LIMIT = '1000';
process.env.LOGIN_THROTTLE_TTL_SECONDS = '60';
