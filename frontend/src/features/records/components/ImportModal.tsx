import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ChangeEvent } from 'react';
import { Button } from '../../../shared/components/Button';
import { Modal, ModalActions } from '../../../shared/components/Modal';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { recordsApi } from '../records.api';
import type { ImportReport, RecordInput, SpreadsheetFormat } from '../types';

const MAX_BYTES = 5 * 1024 * 1024;
/** More than this is unreadable; fixing the first ones is the next step. */
const SHOWN_ERRORS = 100;

const COLUMN_NAMES: Record<keyof RecordInput, string> = {
  date: 'Fecha',
  ex: 'EX',
  ifCode: 'IF',
  subject: 'Motivo',
  department: 'Repartición',
  forwarding: 'Pase',
};

const rows = (count: number) => (count === 1 ? '1 fila' : `${count} filas`);
const records = (count: number) =>
  count === 1 ? '1 registro' : `${count} registros`;

function Preview({ report }: { report: ImportReport }) {
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Filas leídas', report.totalRows, 'text-gray-900'],
          ['Válidas', report.validCount, 'text-green-800'],
          ['Con errores', report.invalidCount, 'text-red-700'],
        ].map(([label, count, color]) => (
          <div key={label} className="rounded-md bg-white p-2 shadow-sm">
            <dt className="text-gray-700">{label}</dt>
            <dd className={`text-2xl font-bold ${color}`}>{count}</dd>
          </div>
        ))}
      </dl>

      {report.duplicateCount > 0 && (
        <p className="rounded-md border border-amber-500 bg-amber-50 p-3 text-amber-900">
          <strong>
            Atención: {rows(report.duplicateCount)} ya{' '}
            {report.duplicateCount === 1 ? 'figura' : 'figuran'} en el sistema.
          </strong>{' '}
          Si importa, quedarán repetidas.
        </p>
      )}

      {report.errors.length > 0 && (
        <>
          {report.validCount > 0 && (
            <p>
              Las filas con errores <strong>no se importarán</strong>.
              Corríjalas en la planilla y cárguelas luego en un archivo aparte.
            </p>
          )}
          <div className="max-h-56 overflow-auto rounded-md bg-white shadow-sm">
            <table className="w-full text-left">
              <caption className="sr-only">Errores por fila</caption>
              <thead className="sticky top-0 bg-canvas">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Columna</th>
                  <th className="px-3 py-2">Problema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.errors.slice(0, SHOWN_ERRORS).map((error) => (
                  <tr key={`${error.row}-${error.field}`}>
                    <td className="px-3 py-1">{error.row}</td>
                    <td className="px-3 py-1">{COLUMN_NAMES[error.field]}</td>
                    <td className="px-3 py-1">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.errors.length > SHOWN_ERRORS && (
            <p className="text-gray-700">
              Se muestran los primeros {SHOWN_ERRORS} de {report.errors.length}{' '}
              errores.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState('');

  const preview = useMutation({
    mutationFn: (chosen: File) => recordsApi.import(chosen, true),
  });
  const commit = useMutation({
    mutationFn: (chosen: File) => recordsApi.import(chosen, false),
    onSuccess: async ({ importedCount, invalidCount }) => {
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      onImported(
        `Importación terminada: ${records(importedCount)}.` +
          (invalidCount
            ? ` Se ${invalidCount === 1 ? 'omitió' : 'omitieron'} ${rows(invalidCount)}.`
            : ''),
      );
    },
  });
  const template = useMutation({
    mutationFn: (format: SpreadsheetFormat) => recordsApi.template(format),
  });

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    // So that picking the same file again, after fixing it, is noticed.
    event.target.value = '';
    if (!chosen) return;

    preview.reset();
    commit.reset();
    if (chosen.size > MAX_BYTES) {
      setFile(null);
      setSizeError('El archivo supera el máximo de 5 MB.');
      return;
    }
    setSizeError('');
    setFile(chosen);
    preview.mutate(chosen);
  };

  const report = preview.data;
  const error = preview.error ?? commit.error ?? template.error;
  const busy = commit.isPending;

  return (
    <Modal
      title="Importar planilla"
      onClose={onClose}
      dismissible={!busy}
      className="w-[min(46rem,calc(100vw-2rem))]"
    >
      <div className="space-y-4">
        <p className="text-sm">
          Columnas: <strong>Fecha</strong> (dd/mm/aaaa), <strong>EX</strong>,{' '}
          <strong>IF</strong>, <strong>Motivo</strong>,{' '}
          <strong>Repartición</strong> y <strong>Pase</strong> (opcional). Se
          lee la primera hoja.
        </p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Descargar plantilla:
          <Button
            variant="outline"
            size="sm"
            onClick={() => template.mutate('xlsx')}
          >
            Plantilla Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => template.mutate('csv')}
          >
            Plantilla CSV
          </Button>
        </p>

        <div>
          <label htmlFor={fileId} className="mb-1 block text-sm font-medium">
            Archivo .xlsx o .csv (máximo 5 MB)
          </label>
          <input
            id={fileId}
            type="file"
            accept=".xlsx,.csv"
            disabled={busy}
            className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:text-white"
            onChange={choose}
          />
          {file && (
            <p className="mt-1 text-sm text-gray-700">
              Seleccionado: {file.name}
            </p>
          )}
        </div>

        {preview.isPending && <p role="status">Revisando la planilla…</p>}
        {sizeError && (
          <p role="alert" className="text-sm text-red-700">
            {sizeError}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {apiErrorMessage(error, 'No se pudo procesar la planilla.')}
          </p>
        )}
        {report && <Preview report={report} />}
      </div>

      <ModalActions>
        <Button
          variant="success"
          disabled={!file || !report?.validCount || busy}
          onClick={() => file && commit.mutate(file)}
        >
          {busy
            ? 'Importando…'
            : report?.validCount
              ? `Importar ${records(report.validCount)}`
              : 'Importar'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}
