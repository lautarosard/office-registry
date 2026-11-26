import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Field';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { useAuth } from '../hooks/useAuth';
import {
  changePasswordSchema,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordForm,
} from '../utils/change-password.schema';

export const ChangePasswordPage = () => {
  const { user, mustChangePassword, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async ({
    currentPassword,
    newPassword,
  }: ChangePasswordForm) => {
    setServerError('');
    try {
      await changePassword({ currentPassword, newPassword });
      navigate('/expedientes', { replace: true });
    } catch (err) {
      setServerError(
        apiErrorMessage(
          err,
          'No se pudo cambiar la contraseña. Intente nuevamente.',
        ),
      );
    }
  };

  return (
    <>
      <h1 className="text-center text-2xl font-bold tracking-wide text-gray-900 uppercase">
        Cambiar contraseña
      </h1>
      <p className="mt-3 text-center text-sm text-gray-700">
        {mustChangePassword
          ? 'Debe definir una contraseña propia antes de continuar.'
          : 'Actualice la contraseña de su cuenta.'}
        {user && (
          <span className="mt-1 block font-semibold">{user.fullName}</span>
        )}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          label="Contraseña actual"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          label="Nueva contraseña"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <p className="text-xs text-gray-700">
          Mínimo {PASSWORD_MIN_LENGTH} caracteres, con al menos una letra y un
          número.
        </p>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          label="Repetir nueva contraseña"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {serverError && (
          <p role="alert" className="text-sm text-red-700">
            {serverError}
          </p>
        )}

        <div className="border-t-2 border-gold pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Confirmar'}
          </Button>
        </div>
      </form>

      <div className="mt-4 text-center text-sm">
        {mustChangePassword ? (
          <button
            type="button"
            className="cursor-pointer text-red-700 underline underline-offset-4"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        ) : (
          <Link
            to="/expedientes"
            className="text-red-700 underline underline-offset-4"
          >
            Cancelar
          </Link>
        )}
      </div>
    </>
  );
};
