import { api } from '../../../services/api-client';
import type { LoginCredentials, LoginResponse } from '../types';

const LOGIN_PATH = '/auth/login';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>(LOGIN_PATH, credentials);
    return data;
  },
};
