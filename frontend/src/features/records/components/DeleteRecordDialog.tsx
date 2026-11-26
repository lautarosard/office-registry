import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { recordsApi } from '../records.api';
import type { RecordItem } from '../types';

export function DeleteRecordDialog({
  record,
  onClose,
  onDeleted,
}: {
  record: RecordItem;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => recordsApi.remove(record.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      onDeleted('Registro eliminado.');
    },
  });

  return (
    <ConfirmDialog
      title="Eliminar registro"
      confirmLabel="Eliminar"
      destructive
      isPending={remove.isPending}
      error={
        remove.isError
          ? apiErrorMessage(remove.error, 'No se pudo eliminar el registro.')
          : undefined
      }
      onConfirm={() => remove.mutate()}
      onCancel={onClose}
    >
      <p>¿Confirma que desea eliminar este registro?</p>
      <p className="font-mono text-xs break-all">{record.ex}</p>
      <p className="font-mono text-xs break-all">{record.ifCode}</p>
    </ConfirmDialog>
  );
}
