export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthState {
    user: {
        id: string;
        email: string;
        name: string;
    } | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
