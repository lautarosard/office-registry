import React from 'react';
import { useLogin } from '../hooks/useLogin';

export const LoginForm = () => {
  const { login, isLoading, error } = useLogin();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    login(data);
  };

  return (
    <div className="login-card">
      <img src="/logo-policia.png" alt="Logo" className="auth-logo" />
      <h2>INICIAR SESIÓN</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Usuario</label>
          <input name="username" type="text" required />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input name="password" type="password" required />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Cargando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
