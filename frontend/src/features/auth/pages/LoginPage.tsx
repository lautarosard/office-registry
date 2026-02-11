import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login({ email, password });
            navigate(from, { replace: true });
        } catch (err) {
            setError('Invalid email or password');
            console.error(err);
        }
    };

    return (
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Sign in to your account
                </h2>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                    <div className="text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div>
                    <Button type="submit" className="w-full">
                        Sign in
                    </Button>
                </div>
            </form>
        </div>
    );
};
