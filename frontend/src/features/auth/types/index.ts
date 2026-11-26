/** Body of POST /api/auth/login (backend LoginRequest DTO). */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Response of POST /api/auth/login (backend loginResponse). */
export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
}

/** Prisma `Role` enum on the backend. */
export type Role = 'USER' | 'ADMIN';

/** Response of GET /api/auth/me. */
export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

/** Body of POST /api/auth/change-password. */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Response of POST /api/auth/change-password. */
export type ChangePasswordResponse = LoginResponse;
