// Prisma CLI configuration (replaces the deprecated `package.json#prisma`).
// A config file disables Prisma's automatic .env loading, so load it here.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
