import { useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { authService } from '../services/auth.service';
import { storage } from '../../../shared/utils/storage';
import type { User, AuthResponse } from '../../../types';
import type { LoginCredentials } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!storage.getToken());
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const response: AuthResponse = await authService.login(credentials);
            storage.setToken(response.accessToken);
            setUser(response.user);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        storage.clearToken();
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
