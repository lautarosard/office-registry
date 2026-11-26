import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { recordsApi } from '../records.api';
import type { ExportFilters, SpreadsheetFormat } from '../types';

/** Export and import. Rendered for ADMIN only; the API enforces it too. */
export function AdminToolbar({
  filters,
  onImport,
}: {
  filters: ExportFilters;
  onImport: () => void;
}) {
  const [format, setFormat] = useState<SpreadsheetFormat>('xlsx');
  const download = useMutation({
    mutationFn: () => recordsApi.export(filters, format),
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {download.isError && (
        <p role="alert" className="text-sm text-red-700">
          {apiErrorMessage(download.error, 'No se pudo exportar.')}
        </p>
      )}
      <select
        aria-label="Formato de exportación"
        className="h-10 rounded-md border border-gray-500 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-navy-800 focus:outline-none"
        value={format}
        onChange={(e) => setFormat(e.target.value as SpreadsheetFormat)}
      >
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="csv">CSV (.csv)</option>
      </select>
      <Button
        variant="secondary"
        disabled={download.isPending}
        title="Descarga los registros que coinciden con los filtros"
        onClick={() => download.mutate()}
      >
        {download.isPending ? 'Exportando…' : 'Exportar'}
      </Button>
      <Button variant="secondary" onClick={onImport}>
        Importar planilla
      </Button>
    </div>
  );
}
