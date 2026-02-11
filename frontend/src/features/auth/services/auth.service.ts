import { api } from '../../../services/api';
import type { AuthResponse } from '../../../types';
import type { LoginCredentials } from '../types';

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const { data } = await api.post<AuthResponse>('/auth/login', credentials);
        return data;
    },

    // Placeholder for other auth methods
    logout: () => {
        // Call api to invalidate token if needed, or just clear local state
        return Promise.resolve();
    }
};
