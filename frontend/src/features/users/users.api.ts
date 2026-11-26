import { api } from '../../services/api-client';
import type { UserAccount, UserInput, UserPage } from './types';

export const usersApi = {
  list: async (q: string, page: number): Promise<UserPage> => {
    const params = { q: q || undefined, page };
    const { data } = await api.get<UserPage>('/users', { params });
    return data;
  },

  create: async (
    input: UserInput,
  ): Promise<UserAccount & { temporaryPassword: string }> => {
    const { data } = await api.post<
      UserAccount & { temporaryPassword: string }
    >('/users', input);
    return data;
  },

  update: async (
    id: string,
    changes: Partial<UserInput & { isActive: boolean }>,
  ): Promise<UserAccount> => {
    const { data } = await api.patch<UserAccount>(`/users/${id}`, changes);
    return data;
  },

  resetPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    const { data } = await api.post<{ temporaryPassword: string }>(
      `/users/${id}/reset-password`,
    );
    return data;
  },
};
