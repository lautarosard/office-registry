import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import type { Role } from '../features/auth/types';
import { Button } from '../shared/components/Button';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario',
};

// Header only. Phase 2 adds the badge and role-based navigation of docs/mock/.
export const PrivateLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b-4 border-gold bg-linear-to-b from-navy-800 to-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold tracking-wide uppercase">
            Registro de Expedientes
          </span>

          <div className="flex flex-wrap items-center gap-4">
            {user && (
              <p className="text-right text-sm leading-tight">
                <span className="block font-semibold">{user.name}</span>
                <span className="block text-gray-300">
                  {ROLE_LABELS[user.role]}
                </span>
              </p>
            )}
            <Link
              to="/change-password"
              className="text-sm underline underline-offset-4 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              Cambiar contraseña
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-white/60 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
