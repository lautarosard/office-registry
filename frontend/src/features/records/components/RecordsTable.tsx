import { Button } from '../../../shared/components/Button';
import { CopyButton } from '../../../shared/components/CopyButton';
import { DataTable } from '../../../shared/components/DataTable';
import { formatDay } from '../../../shared/utils/format';
import type { User } from '../../auth/types';
import type { RecordItem } from '../types';

const HEADINGS = [
  'Fecha',
  'EX',
  'IF',
  'Motivo',
  'Repartición',
  'Pase',
  'Cargado por',
  'Acciones',
];

export type RowAction = 'edit' | 'delete' | 'history';

function GdeCell({ value, name }: { value: string; name: string }) {
  return (
    <td>
      <span className="flex items-center gap-1 font-mono text-xs whitespace-nowrap">
        {value}
        <CopyButton value={value} label={`Copiar ${name}`} />
      </span>
    </td>
  );
}

export function RecordsTable({
  records,
  user,
  onAction,
}: {
  records: RecordItem[];
  user: User;
  onAction: (action: RowAction, record: RecordItem) => void;
}) {
  return (
    <DataTable caption="Expedientes" headings={HEADINGS}>
      {records.map((record) => {
        // Mirrors the API rule, which is what actually enforces it.
        const canModify =
          user.role === 'ADMIN' || record.createdBy.id === user.id;

        return (
          <tr key={record.id}>
            <td className="whitespace-nowrap">{formatDay(record.date)}</td>
            <GdeCell value={record.ex} name="EX" />
            <GdeCell value={record.ifCode} name="IF" />
            <td className="min-w-40 break-words">{record.subject}</td>
            <td>{record.department}</td>
            <td>{record.forwarding ?? '---'}</td>
            <td>{record.createdBy.fullName}</td>
            <td>
              <div className="flex gap-1">
                {canModify && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="px-2"
                      onClick={() => onAction('edit', record)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="px-2 text-red-700"
                      onClick={() => onAction('delete', record)}
                    >
                      Eliminar
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={() => onAction('history', record)}
                >
                  Historial
                </Button>
              </div>
            </td>
          </tr>
        );
      })}
    </DataTable>
  );
}
