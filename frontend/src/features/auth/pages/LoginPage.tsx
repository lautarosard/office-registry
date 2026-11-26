import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';

function loginErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (err.response?.status === 401) return 'Usuario o contraseña incorrectos.';
    if (err.response?.status === 429) {
      return 'Demasiados intentos. Espere un momento e intente nuevamente.';
    }
    if (!err.response) return 'No se pudo conectar con el servidor.';
  }
  return 'Ocurrió un error al iniciar sesión. Intente nuevamente.';
}

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || '/dashboard';

  // Also covers a successful submit. ProtectedRoute then sends users with a
  // pending password change to /change-password.
  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    setIsSubmitting(true);
    try {
      await login({ username: username.trim(), password });
    } catch (err) {
      setError(loginErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-center text-2xl font-bold tracking-wide text-gray-900">
        INICIAR SESIÓN
      </h1>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !username.trim() || !password}
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </>
  );
};
