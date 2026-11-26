import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context';
import { authService } from '../services/auth.service';
import { storage } from '../../../shared/utils/storage';
import type { ChangePasswordPayload, LoginCredentials, User } from '../types';

const ME_QUERY = {
  queryKey: ['auth', 'me'],
  queryFn: authService.me,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => !!storage.getToken());

  // Hydrates the session on startup/reload from the stored token.
  const me = useQuery({
    ...ME_QUERY,
    enabled: hasToken,
    staleTime: 60_000,
    retry: 1,
  });
  const user = hasToken ? (me.data ?? null) : null;

  const login = async (credentials: LoginCredentials) => {
    const { accessToken } = await authService.login(credentials);
    storage.setToken(accessToken);
    try {
      await queryClient.fetchQuery({ ...ME_QUERY, staleTime: 0 });
    } catch (err) {
      storage.clearToken();
      throw err;
    }
    setHasToken(true);
  };

  const changePassword = async (payload: ChangePasswordPayload) => {
    const { accessToken, mustChangePassword } =
      await authService.changePassword(payload);
    storage.setToken(accessToken);
    queryClient.setQueryData<User>(
      ME_QUERY.queryKey,
      (current) => current && { ...current, mustChangePassword },
    );
  };

  const logout = () => {
    storage.clearToken();
    setHasToken(false);
    // Drop every cached response so the next user never sees it.
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        mustChangePassword: user?.mustChangePassword ?? false,
        isLoading: hasToken && me.isPending,
        hasSessionError: hasToken && me.isError && !me.data,
        retrySession: () => void me.refetch(),
        login,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
