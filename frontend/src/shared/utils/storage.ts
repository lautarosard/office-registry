const STORAGE_PREFIX = 'app_';

export const storage = {
    getToken: () => JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}token`) || 'null'),
    setToken: (token: string) => window.localStorage.setItem(`${STORAGE_PREFIX}token`, JSON.stringify(token)),
    clearToken: () => window.localStorage.removeItem(`${STORAGE_PREFIX}token`),
};
