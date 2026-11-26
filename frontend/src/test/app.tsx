import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import type { User } from '../features/auth/types';
import type { RecordItem, RecordPage } from '../features/records/types';
import { queryClient } from '../shared/query-client';

export const admin: User = {
  id: 'admin-id',
  username: 'jperez',
  fullName: 'Juana Pérez',
  role: 'ADMIN',
  isActive: true,
  mustChangePassword: false,
};

export const officer: User = {
  ...admin,
  id: 'user-id',
  username: 'mgomez',
  fullName: 'Mario Gómez',
  role: 'USER',
};

export const record = (overrides: Partial<RecordItem> = {}): RecordItem => ({
  id: 'r1',
  date: '2026-03-05',
  ex: 'EX-2025-1-APN-DIFP#PFA',
  ifCode: 'IF-2025-2-APN-SOPDGA#PFA',
  subject: 'Diagramación de servicio',
  department: 'DGO#PFA',
  forwarding: null,
  createdAt: '2026-03-05T12:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
  createdBy: {
    id: officer.id,
    username: officer.username,
    fullName: officer.fullName,
  },
  updatedBy: null,
  ...overrides,
});

export const pageOf = (
  data: RecordItem[],
  meta: Partial<RecordPage['meta']> = {},
): RecordPage => ({
  data,
  meta: {
    total: data.length,
    page: 1,
    pageSize: 20,
    totalPages: data.length ? 1 : 0,
    ...meta,
  },
});

/** Fresh cache and storage; failed queries don't retry in tests. */
export function resetApp() {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  window.localStorage.clear();
}

export function openApp(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}

export const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

export const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));
