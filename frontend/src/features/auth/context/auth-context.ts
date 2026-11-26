import { createContext } from 'react';
import type { LoginCredentials } from '../types';

export interface AuthContextType {
  isAuthenticated: boolean;
  /** From the last login response. Enforced in Phase 1 (change-password flow). */
  mustChangePassword: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
