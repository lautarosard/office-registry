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
