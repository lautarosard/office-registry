import type { Role } from '@prisma/client';

export type CreateUserData = {
  username: string;
  password: string;
  role: Role;
  name: string;
};
