const TOKEN_KEY = 'office_registry_token';

/** Stores the raw JWT string (no JSON wrapping). */
export const storage = {
  getToken: (): string | null => window.localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => window.localStorage.removeItem(TOKEN_KEY),
};
