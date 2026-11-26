import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

/** Convenience only: the API enforces the ADMIN role on /api/users. */
export const AdminRoute = () => {
  const { user } = useAuth();

  return user?.role === 'ADMIN' ? (
    <Outlet />
  ) : (
    <Navigate to="/expedientes" replace />
  );
};
