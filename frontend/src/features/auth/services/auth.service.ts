import { api } from '../../../services/api-client';
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  LoginCredentials,
  LoginResponse,
  User,
} from '../types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  changePassword: async (
    payload: ChangePasswordPayload,
  ): Promise<ChangePasswordResponse> => {
    const { data } = await api.post<ChangePasswordResponse>(
      '/auth/change-password',
      payload,
    );
    return data;
  },
};
