import { createContext } from 'react';
import type { ChangePasswordPayload, LoginCredentials, User } from '../types';

export interface AuthContextType {
  /** Profile from GET /api/auth/me; null while logged out or loading. */
  user: User | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  /** A stored token is being validated against the API. */
  isLoading: boolean;
  /** The stored token could not be validated (e.g. server unreachable). */
  hasSessionError: boolean;
  retrySession: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
