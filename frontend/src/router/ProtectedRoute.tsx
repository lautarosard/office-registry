import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { Button } from '../shared/components/Button';

export const ProtectedRoute = () => {
  const {
    isAuthenticated,
    isLoading,
    hasSessionError,
    mustChangePassword,
    retrySession,
    logout,
  } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <p role="status" className="p-8 text-center text-gray-700">
        Cargando…
      </p>
    );
  }

  if (hasSessionError) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p role="alert" className="text-red-700">
          No se pudo verificar la sesión con el servidor.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={retrySession}>Reintentar</Button>
          <Button variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // The API enforces this too; here it only keeps the user on the right page.
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
};
