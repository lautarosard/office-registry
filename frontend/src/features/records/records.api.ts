import { api } from '../../services/api-client';
import type {
  AuditEntry,
  RecordInput,
  RecordItem,
  RecordPage,
  RecordSearch,
} from './types';

export const recordsApi = {
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
