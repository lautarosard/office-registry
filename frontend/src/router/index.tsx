import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { PublicLayout } from '../layouts/PublicLayout';
import { PrivateLayout } from '../layouts/PrivateLayout';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                    <Route element={<PrivateLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
};
