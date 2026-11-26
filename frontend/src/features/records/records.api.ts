import { api } from '../../services/api-client';
import { today } from '../../shared/utils/format';
import { saveFile } from '../../shared/utils/save-file';
import type {
  AuditEntry,
  Catalogs,
  ExportFilters,
  ImportReport,
  SpreadsheetFormat,
  RecordInput,
  RecordItem,
  RecordPage,
  RecordSearch,
} from './types';

async function download(
  url: string,
  params: object,
  fileName: string,
): Promise<void> {
  // A plain link couldn't send the token, so fetch the file and then save it.
  const { data } = await api.get<Blob>(url, { params, responseType: 'blob' });
  saveFile(data, fileName);
}

export const recordsApi = {
  catalogs: async (): Promise<Catalogs> => {
    const { data } = await api.get<Catalogs>('/records/catalogs');
    return data;
  },

  export: (
    { q, from, to }: ExportFilters,
    format: SpreadsheetFormat,
  ): Promise<void> =>
    download(
      '/records/export',
      {
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        format,
      },
      `expedientes_${today()}.${format}`,
    ),

  template: (format: SpreadsheetFormat): Promise<void> =>
    download(
      '/records/import-template',
      { format },
      `plantilla_expedientes.${format}`,
    ),

  import: async (file: File, dryRun: boolean): Promise<ImportReport> => {
    const body = new FormData();
    body.append('file', file);
    const { data } = await api.post<ImportReport>('/records/import', body, {
      params: { dryRun },
      // Overrides the JSON default, which would turn the FormData into JSON.
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  list: async ({ q, from, to, page }: RecordSearch): Promise<RecordPage> => {
    // Empty filters are omitted: the API rejects a blank date.
    const params = {
      q: q || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
    };
    const { data } = await api.get<RecordPage>('/records', { params });
    return data;
  },

  create: async (input: RecordInput): Promise<RecordItem> => {
    const { data } = await api.post<RecordItem>('/records', input);
    return data;
  },

  update: async (
    id: string,
    changes: Partial<RecordInput>,
  ): Promise<RecordItem> => {
    const { data } = await api.patch<RecordItem>(`/records/${id}`, changes);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/records/${id}`);
  },

  history: async (id: string): Promise<AuditEntry[]> => {
    const { data } = await api.get<AuditEntry[]>(`/records/${id}/audit`);
    return data;
  },
};
