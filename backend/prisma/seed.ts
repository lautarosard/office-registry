import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Seeds the initial ADMIN account. All values come from env — no hardcoded
 * credentials. Idempotent: does nothing if the username already exists.
 *
 *   SEED_ADMIN_USERNAME              (default: "admin")
 *   SEED_ADMIN_NAME                  (default: "Administrador")
 *   SEED_ADMIN_PASSWORD              (required)
 *   SEED_ADMIN_MUST_CHANGE_PASSWORD  (default: "true")
 */
const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim() || 'admin';
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Administrador';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const mustChangePassword =
    (process.env.SEED_ADMIN_MUST_CHANGE_PASSWORD ?? 'true').toLowerCase() !==
    'false';

  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD is not set. Define it in backend/.env before seeding.',
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Seed: user "${username}" already exists, skipping.`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      name,
      password: await bcrypt.hash(password, 10),
      role: Role.ADMIN,
      isActive: true,
      mustChangePassword,
    },
  });

  console.log(
    `Seed: created ADMIN "${username}" (mustChangePassword=${mustChangePassword}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
