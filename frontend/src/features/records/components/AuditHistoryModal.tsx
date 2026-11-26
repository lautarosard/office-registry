import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../shared/components/Button';
import { ErrorMessage } from '../../../shared/components/DataTable';
import { Modal, ModalActions } from '../../../shared/components/Modal';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { formatDateTime, formatDay } from '../../../shared/utils/format';
import { recordsApi } from '../records.api';
import type { AuditEntry, RecordItem } from '../types';

const ACTIONS: Record<AuditEntry['action'], string> = {
  CREATE: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
};

const FIELDS = [
  ['date', 'Fecha'],
  ['ex', 'EX'],
  ['ifCode', 'IF'],
  ['subject', 'Motivo'],
  ['department', 'Repartición'],
  ['forwarding', 'Pase'],
] as const;

const show = (field: string, value: string | null | undefined) => {
  if (!value) return '---';
  return field === 'date' ? formatDay(value) : value;
};

function Changes({ before, after }: Pick<AuditEntry, 'before' | 'after'>) {
  if (!before || !after) return null;
  const changed = FIELDS.filter(([key]) => before[key] !== after[key]);

  return (
    <ul className="mt-1 space-y-1 break-words">
      {changed.map(([key, label]) => (
        <li key={key}>
          <span className="font-medium">{label}:</span> {show(key, before[key])}{' '}
          <span aria-label="cambió a">→</span> {show(key, after[key])}
        </li>
      ))}
    </ul>
  );
}

export function AuditHistoryModal({
  record,
  onClose,
}: {
  record: RecordItem;
  onClose: () => void;
}) {
  const history = useQuery({
    queryKey: ['records', record.id, 'audit'],
    queryFn: () => recordsApi.history(record.id),
  });

  return (
    <Modal title="Historial" onClose={onClose}>
      <p className="mb-4 text-center font-mono text-xs break-all">{record.ex}</p>

      {history.isPending && <p role="status">Cargando historial…</p>}
      {history.isError && (
        <ErrorMessage
          message={apiErrorMessage(history.error, 'No se pudo cargar el historial.')}
          onRetry={() => void history.refetch()}
        />
      )}
      {history.data && (
        <ol className="space-y-3 text-sm">
          {history.data.map((entry) => (
            <li key={entry.id} className="rounded-md bg-white p-3 shadow-sm">
              <p>
                <span className="font-bold">{ACTIONS[entry.action]}</span> ·{' '}
                {formatDateTime(entry.createdAt)} ·{' '}
                {entry.performedBy.fullName} ({entry.performedBy.username})
              </p>
              <Changes before={entry.before} after={entry.after} />
            </li>
          ))}
        </ol>
      )}

      <ModalActions>
        <Button variant="secondary" data-autofocus onClick={onClose}>
          Cerrar
        </Button>
      </ModalActions>
    </Modal>
  );
}
