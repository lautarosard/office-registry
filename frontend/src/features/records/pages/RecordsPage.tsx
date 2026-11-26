import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import {
  ErrorMessage,
  ListMessage,
} from '../../../shared/components/DataTable';
import { Input } from '../../../shared/components/Field';
import { Pagination } from '../../../shared/components/Pagination';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { useDebouncedValue } from '../../../shared/utils/useDebouncedValue';
import { useAuth } from '../../auth/hooks/useAuth';
import { AdminToolbar } from '../components/AdminToolbar';
import { AuditHistoryModal } from '../components/AuditHistoryModal';
import { DeleteRecordDialog } from '../components/DeleteRecordDialog';
import { ImportModal } from '../components/ImportModal';
import { RecordFormModal } from '../components/RecordFormModal';
import { RecordsTable, type RowAction } from '../components/RecordsTable';
import { recordsApi } from '../records.api';
import type { RecordItem } from '../types';

type OpenModal =
  | { type: 'create' | 'import' }
  | { type: RowAction; record: RecordItem }
  | null;

export const RecordsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<OpenModal>(null);
  const [notice, setNotice] = useState('');
  const q = useDebouncedValue(search.trim());

  const records = useQuery({
    queryKey: ['records', { q, from, to, page }],
    queryFn: () => recordsApi.list({ q, from, to, page }),
    placeholderData: keepPreviousData,
  });

  // The last row of the last page was deleted: step back to a page that exists.
  const totalPages = records.data?.meta.totalPages ?? 0;
  if (!records.isPlaceholderData && totalPages > 0 && page > totalPages) {
    setPage(totalPages);
  }

  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };
  const hasFilters = Boolean(search || from || to);
  const clearFilters = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const closeModal = () => setModal(null);
  const finish = (message: string) => {
    setModal(null);
    setNotice(message);
  };
  const open = (next: OpenModal) => {
    setNotice('');
    setModal(next);
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Expedientes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Input
            type="search"
            label="Buscar"
            placeholder="EX, IF, motivo o repartición…"
            maxLength={200}
            value={search}
            onChange={(e) => filter(setSearch)(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            label="Desde"
            value={from}
            onChange={(e) => filter(setFrom)(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            label="Hasta"
            value={to}
            onChange={(e) => filter(setTo)(e.target.value)}
          />
        </div>
        <Button variant="secondary" disabled={!hasFilters} onClick={clearFilters}>
          Limpiar filtros
        </Button>
        <Button variant="success" onClick={() => open({ type: 'create' })}>
          Nuevo registro
        </Button>
      </div>

      {user?.role === 'ADMIN' && (
        <AdminToolbar
          filters={{ q: search.trim(), from, to }}
          onImport={() => open({ type: 'import' })}
        />
      )}

      {from && to && from > to && (
        <p role="alert" className="text-sm text-red-700">
          La fecha “Desde” es posterior a “Hasta”.
        </p>
      )}
      <p role="status" className="text-sm font-medium text-green-800">
        {notice}
      </p>

      <div className="border-t-2 border-gold" />

      {records.isError && (
        <ErrorMessage
          message={apiErrorMessage(
            records.error,
            'No se pudieron cargar los expedientes.',
          )}
          onRetry={() => void records.refetch()}
        />
      )}
      {records.isPending && <ListMessage>Cargando expedientes…</ListMessage>}
      {records.data && user && (
        <>
          {records.data.data.length === 0 ? (
            <ListMessage>No se encontraron expedientes</ListMessage>
          ) : (
            <RecordsTable
              records={records.data.data}
              user={user}
              onAction={(type, record) => open({ type, record })}
            />
          )}
          <Pagination meta={records.data.meta} onPageChange={setPage} />
        </>
      )}

      {modal?.type === 'create' && (
        <RecordFormModal onClose={closeModal} onSaved={finish} />
      )}
      {modal?.type === 'import' && (
        <ImportModal onClose={closeModal} onImported={finish} />
      )}
      {modal?.type === 'edit' && (
        <RecordFormModal
          record={modal.record}
          onClose={closeModal}
          onSaved={finish}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteRecordDialog
          record={modal.record}
          onClose={closeModal}
          onDeleted={finish}
        />
      )}
      {modal?.type === 'history' && (
        <AuditHistoryModal record={modal.record} onClose={closeModal} />
      )}
    </div>
  );
};
