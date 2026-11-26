import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import type { Role } from '../features/auth/types';
import { Button } from '../shared/components/Button';
import { Logo } from '../shared/components/Logo';
import { cn } from '../shared/utils/cn';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario',
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 py-1 text-lg font-bold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none',
    isActive
      ? 'border-gold text-white'
      : 'border-transparent text-gray-300 hover:text-white',
  );

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
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />

          <nav aria-label="Principal" className="flex gap-10">
            <NavLink to="/expedientes" className={navClass}>
              Expedientes
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/usuarios" className={navClass}>
                Usuarios
              </NavLink>
            )}
          </nav>

          <div className="flex flex-wrap items-center gap-4">
            {user && (
              <p className="text-right text-sm leading-tight">
                <span className="block font-semibold">{user.fullName}</span>
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

      <main className="mx-auto max-w-[100rem] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
};
