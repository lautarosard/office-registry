import type { Role } from '@prisma/client';

export interface UserResponse {
  id: string;
  username: string;
  name: string;
  role: Role;
  tempPass: string;
}
