import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RecordsPage } from '../features/records/pages/RecordsPage';
import { UsersPage } from '../features/users/pages/UsersPage';
import { PublicLayout } from '../layouts/PublicLayout';
import { PrivateLayout } from '../layouts/PrivateLayout';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          {/* No app navigation here: the change can be mandatory. */}
          <Route element={<PublicLayout />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route element={<PrivateLayout />}>
            <Route path="/expedientes" element={<RecordsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/usuarios" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/expedientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
