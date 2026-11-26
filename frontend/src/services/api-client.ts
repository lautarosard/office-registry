import axios from 'axios';
import { storage } from '../shared/utils/storage';

// Same-origin `/api` by default: Vite proxies it in dev, Nginx in production.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the login call means "bad credentials": let the form show it
    // instead of reloading the page. Any other 401 means the session expired.
    const isLoginCall = error.config?.url?.endsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginCall) {
      storage.clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
