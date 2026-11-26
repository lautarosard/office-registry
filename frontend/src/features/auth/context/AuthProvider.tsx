import { useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { authService } from '../services/auth.service';
import { storage } from '../../../shared/utils/storage';
import type { LoginCredentials } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!storage.getToken(),
  );
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      storage.setToken(response.accessToken);
      setMustChangePassword(response.mustChangePassword);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    storage.clearToken();
    setMustChangePassword(false);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, mustChangePassword, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
