import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { Button } from '../shared/components/Button';

export const PrivateLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex flex-shrink-0 items-center">
                                <span className="text-xl font-bold text-gray-900">App</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-sm text-gray-700">
                                Welcome, {user?.name || 'User'}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
