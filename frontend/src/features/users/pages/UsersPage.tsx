import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  DataTable,
  ErrorMessage,
  ListMessage,
} from '../../../shared/components/DataTable';
import { Input } from '../../../shared/components/Field';
import { Pagination } from '../../../shared/components/Pagination';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { cn } from '../../../shared/utils/cn';
import { formatDni } from '../../../shared/utils/format';
import { useDebouncedValue } from '../../../shared/utils/useDebouncedValue';
import { useAuth } from '../../auth/hooks/useAuth';
import { TemporaryPasswordModal } from '../components/TemporaryPasswordModal';
import { UserFormModal } from '../components/UserFormModal';
import type { UserAccount } from '../types';
import { usersApi } from '../users.api';

const HEADINGS = ['DNI', 'Usuario', 'Nombre', 'Rol', 'Estado', 'Acciones'];

type OpenModal =
  | { type: 'create' }
  | { type: 'edit' | 'deactivate' | 'reset'; account: UserAccount }
  | { type: 'password'; username: string; password: string }
  | null;

export const UsersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<OpenModal>(null);
  const [notice, setNotice] = useState('');
  const q = useDebouncedValue(search.trim());

  const users = useQuery({
    queryKey: ['users', { q, page }],
    queryFn: () => usersApi.list(q, page),
    placeholderData: keepPreviousData,
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setModal(null);
      setNotice(
        `Usuario ${account.username} ${account.isActive ? 'activado' : 'desactivado'}.`,
      );
    },
  });

  const reset = useMutation({
    gcTime: 0, // the response carries a password
    mutationFn: (account: UserAccount) => usersApi.resetPassword(account.id),
    onSuccess: ({ temporaryPassword }, account) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setModal({
        type: 'password',
        username: account.username,
        password: temporaryPassword,
      });
    },
  });

  const open = (next: OpenModal) => {
    setNotice('');
    setActive.reset();
    reset.reset();
    setModal(next);
  };
  const close = () => setModal(null);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Usuarios</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Input
            type="search"
            label="Buscar"
            placeholder="DNI, usuario o nombre…"
            maxLength={200}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="success" onClick={() => open({ type: 'create' })}>
          Nuevo usuario
        </Button>
      </div>

      <p role="status" className="text-sm font-medium text-green-800">
        {notice}
      </p>
      {/* Activation has no dialog of its own, so its errors show here. */}
      {setActive.isError && modal === null && (
        <p role="alert" className="text-sm text-red-700">
          {apiErrorMessage(setActive.error, 'No se pudo activar el usuario.')}
        </p>
      )}

      <div className="border-t-2 border-gold" />

      {users.isError && (
        <ErrorMessage
          message={apiErrorMessage(
            users.error,
            'No se pudieron cargar los usuarios.',
          )}
          onRetry={() => void users.refetch()}
        />
      )}
      {users.isPending && <ListMessage>Cargando usuarios…</ListMessage>}
      {users.data && (
        <>
          {users.data.data.length === 0 ? (
            <ListMessage>No se encontraron usuarios</ListMessage>
          ) : (
            <DataTable caption="Usuarios" headings={HEADINGS}>
              {users.data.data.map((account) => {
                const isSelf = account.id === user?.id;
                return (
                  <tr key={account.id}>
                    <td className="whitespace-nowrap">
                      {formatDni(account.dni)}
                    </td>
                    <td>{account.username}</td>
                    <td>{account.fullName}</td>
                    <td>
                      {account.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
                    </td>
                    <td>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          account.isActive
                            ? 'bg-green-100 text-green-900'
                            : 'bg-gray-200 text-gray-800',
                        )}
                      >
                        {account.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => open({ type: 'edit', account })}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSelf || setActive.isPending}
                          title={
                            isSelf
                              ? 'No puede desactivar su propia cuenta'
                              : undefined
                          }
                          onClick={() => {
                            if (account.isActive) {
                              open({ type: 'deactivate', account });
                            } else {
                              open(null);
                              setActive.mutate({
                                id: account.id,
                                isActive: true,
                              });
                            }
                          }}
                        >
                          {account.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSelf}
                          title={
                            isSelf ? 'Use “Cambiar contraseña”' : undefined
                          }
                          onClick={() => open({ type: 'reset', account })}
                        >
                          Restablecer contraseña
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
          <Pagination meta={users.data.meta} onPageChange={setPage} />
        </>
      )}

      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <UserFormModal
          account={modal.type === 'edit' ? modal.account : undefined}
          isSelf={modal.type === 'edit' && modal.account.id === user?.id}
          onClose={close}
          onCreated={(username, password) =>
            setModal({ type: 'password', username, password })
          }
          onUpdated={(message) => {
            setModal(null);
            setNotice(message);
          }}
        />
      )}
      {modal?.type === 'deactivate' && (
        <ConfirmDialog
          title="Desactivar usuario"
          confirmLabel="Desactivar"
          destructive
          isPending={setActive.isPending}
          error={
            setActive.isError
              ? apiErrorMessage(setActive.error, 'No se pudo desactivar.')
              : undefined
          }
          onConfirm={() =>
            setActive.mutate({ id: modal.account.id, isActive: false })
          }
          onCancel={close}
        >
          <p>
            ¿Desactivar a <strong>{modal.account.fullName}</strong>?
          </p>
          <p>Se cerrarán sus sesiones y no podrá ingresar.</p>
        </ConfirmDialog>
      )}
      {modal?.type === 'reset' && (
        <ConfirmDialog
          title="Restablecer contraseña"
          confirmLabel="Restablecer"
          isPending={reset.isPending}
          error={
            reset.isError
              ? apiErrorMessage(reset.error, 'No se pudo restablecer.')
              : undefined
          }
          onConfirm={() => reset.mutate(modal.account)}
          onCancel={close}
        >
          <p>
            ¿Generar una contraseña temporal para{' '}
            <strong>{modal.account.fullName}</strong>?
          </p>
          <p>La contraseña actual dejará de funcionar y se cerrarán sus sesiones.</p>
        </ConfirmDialog>
      )}
      {modal?.type === 'password' && (
        <TemporaryPasswordModal
          username={modal.username}
          password={modal.password}
          onClose={() => {
            reset.reset();
            close();
          }}
        />
      )}
    </div>
  );
};
