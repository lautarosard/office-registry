export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
}
export interface LoginRequest {
  username: string;
  password: string;
}
