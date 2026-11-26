import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '../../../shared/components/Button';
import { Input, Select } from '../../../shared/components/Field';
import { Modal, ModalActions } from '../../../shared/components/Modal';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import type { UserAccount } from '../types';
import { userSchema, type UserForm } from '../user.schema';
import { usersApi } from '../users.api';

interface UserFormModalProps {
  /** Present when editing. */
  account?: UserAccount;
  isSelf?: boolean;
  onClose: () => void;
  onCreated: (username: string, temporaryPassword: string) => void;
  onUpdated: (message: string) => void;
}

export function UserFormModal({
  account,
  isSelf,
  onClose,
  onCreated,
  onUpdated,
}: UserFormModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      dni: account?.dni ?? '',
      username: account?.username ?? '',
      fullName: account?.fullName ?? '',
      role: account?.role ?? 'USER',
    },
  });

  const save = useMutation({
    // The response carries a password: don't keep it in the mutation cache.
    gcTime: 0,
    mutationFn: async (form: UserForm) => {
      if (!account) {
        const created = await usersApi.create(form);
        return { temporaryPassword: created.temporaryPassword, form };
      }
      const changes = Object.fromEntries(
        Object.entries(form).filter(
          ([key]) => dirtyFields[key as keyof UserForm],
        ),
      );
      await usersApi.update(account.id, changes);
      return { temporaryPassword: undefined, form };
    },
    onSuccess: ({ temporaryPassword, form }) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      // Editing your own account changes what the header shows.
      if (isSelf) void queryClient.invalidateQueries({ queryKey: ['auth'] });

      if (temporaryPassword) onCreated(form.username, temporaryPassword);
      else onUpdated('Usuario actualizado.');
    },
  });

  return (
    <Modal title={account ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((form) => save.mutate(form))}
      >
        <Input
          label="DNI"
          inputMode="numeric"
          autoComplete="off"
          error={errors.dni?.message}
          {...register('dni')}
        />
        <Input
          label="Usuario"
          autoComplete="off"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Nombre"
          autoComplete="off"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        {isSelf ? (
          <p className="text-sm">
            <span className="font-medium">Rol:</span> Administrador (no puede
            quitarse este rol a sí mismo)
          </p>
        ) : (
          <Select label="Rol" error={errors.role?.message} {...register('role')}>
            <option value="USER">Usuario</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        )}

        {save.isError && (
          <p role="alert" className="text-sm text-red-700">
            {apiErrorMessage(save.error, 'No se pudo guardar el usuario.')}
          </p>
        )}
        <ModalActions>
          <Button type="submit" variant="success" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Confirmar'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
