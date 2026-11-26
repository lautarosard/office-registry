import { useState } from 'react';
import { loginFn } from '../api/login.api';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginFn(data);
      localStorage.setItem('token', response.accessToken);
      // Aquí podrías redirigir al dashboard
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};
