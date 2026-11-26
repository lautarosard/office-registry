import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  admin,
  click,
  officer,
  openApp,
  pageOf,
  record,
  resetApp,
  type,
} from '../../test/app';
import { storage } from '../../shared/utils/storage';
import { today } from '../../shared/utils/format';
import { authService } from '../auth/services/auth.service';
import type { User } from '../auth/types';
import { recordsApi } from './records.api';

vi.mock('../auth/services/auth.service', () => ({
  authService: { login: vi.fn(), me: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('./records.api', () => ({
  recordsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    history: vi.fn(),
    catalogs: vi.fn(),
    export: vi.fn(),
    template: vi.fn(),
    import: vi.fn(),
  },
}));

const own = record();
const foreign = record({
  id: 'r2',
  ex: 'EX-2025-9-APN',
  forwarding: 'Archivo',
  createdBy: { id: 'other', username: 'otro', fullName: 'Otra Persona' },
});

async function openAs(user: User, records = [own, foreign]) {
  vi.mocked(authService.me).mockResolvedValue(user);
  vi.mocked(recordsApi.list).mockResolvedValue(pageOf(records));
  storage.setToken('token');
  openApp('/expedientes');
  if (records.length) await screen.findByRole('table');
}

const rowOf = (ex: string) => screen.getByText(ex).closest('tr')!;
const lastSearch = () => vi.mocked(recordsApi.list).mock.lastCall?.[0];

describe('Expedientes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApp();
  });

  it('shows dates as dd/mm/yyyy, "---" without pase and the author', async () => {
    await openAs(officer);

    const row = within(rowOf(own.ex));
    expect(row.getByText('05/03/2026')).toBeTruthy();
    expect(row.getByText('---')).toBeTruthy();
    expect(row.getByText('Mario Gómez')).toBeTruthy();
    expect(within(rowOf(foreign.ex)).getByText('Archivo')).toBeTruthy();
  });

  it('offers a USER edit and delete only on their own records', async () => {
    await openAs(officer);

    const mine = within(rowOf(own.ex));
    expect(mine.getByRole('button', { name: 'Editar' })).toBeTruthy();
    expect(mine.getByRole('button', { name: 'Eliminar' })).toBeTruthy();
    const theirs = within(rowOf(foreign.ex));
    expect(theirs.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(theirs.queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(theirs.getByRole('button', { name: 'Historial' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).toBeNull();
  });

  it('offers an ADMIN every action and the Usuarios section', async () => {
    await openAs(admin);

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeTruthy();
  });

  it('shows the empty state', async () => {
    await openAs(officer, []);

    expect(
      await screen.findByText('No se encontraron expedientes'),
    ).toBeTruthy();
  });

  it('shows an error with a retry', async () => {
    vi.mocked(authService.me).mockResolvedValue(officer);
    vi.mocked(recordsApi.list).mockRejectedValue(new AxiosError('Network'));
    storage.setToken('token');
    openApp('/expedientes');

    expect(
      await screen.findByText('No se pudo conectar con el servidor.'),
    ).toBeTruthy();

    vi.mocked(recordsApi.list).mockResolvedValue(pageOf([own]));
    click('Reintentar');
    expect(await screen.findByText(own.ex)).toBeTruthy();
  });

  it('searches after a pause, filters by date and clears', async () => {
    await openAs(officer);
    vi.mocked(recordsApi.list).mockClear();

    type('Buscar', 'dg');
    type('Buscar', 'dgo');
    await waitFor(() => expect(lastSearch()?.q).toBe('dgo'));
    // The intermediate keystroke never reached the server.
    expect(
      vi.mocked(recordsApi.list).mock.calls.map(([s]) => s.q),
    ).not.toContain('dg');

    type('Desde', '2026-01-01');
    type('Hasta', '2026-02-01');
    await waitFor(() =>
      expect(lastSearch()).toEqual({
        q: 'dgo',
        from: '2026-01-01',
        to: '2026-02-01',
        page: 1,
      }),
    );

    click('Limpiar filtros');
    await waitFor(() => expect(screen.getByLabelText('Buscar')).toHaveProperty('value', ''));
    expect(screen.getByLabelText('Desde')).toHaveProperty('value', '');
  });

  it('moves between pages', async () => {
    vi.mocked(authService.me).mockResolvedValue(officer);
    vi.mocked(recordsApi.list).mockImplementation(({ page }) =>
      Promise.resolve(pageOf([own], { total: 25, page, totalPages: 2 })),
    );
    storage.setToken('token');
    openApp('/expedientes');

    expect(await screen.findByText('Página 1 de 2')).toBeTruthy();
    click('Siguiente');

    expect(await screen.findByText('Página 2 de 2')).toBeTruthy();
    expect(screen.getByText('Mostrando 21–25 de 25')).toBeTruthy();
  });

  it('creates a record with today by default and upper-cased EX/IF', async () => {
    await openAs(officer);
    vi.mocked(recordsApi.create).mockResolvedValue(own);

    click('Nuevo registro');
    expect(screen.getByLabelText('Fecha')).toHaveProperty('value', today());

    click('Confirmar');
    expect(await screen.findByText('Ingrese el EX.')).toBeTruthy();
    expect(screen.getByText('Ingrese el motivo.')).toBeTruthy();
    expect(recordsApi.create).not.toHaveBeenCalled();

    type('EX', 'ex-2026-7-apn');
    expect(screen.getByLabelText('EX')).toHaveProperty(
      'value',
      'EX-2026-7-APN',
    );
    type('IF', 'if-2026-8-apn');
    type('Motivo', ' Nota ');
    type('Repartición', 'DGO#PFA');
    click('Confirmar');

    expect(await screen.findByText('Registro creado.')).toBeTruthy();
    expect(vi.mocked(recordsApi.create).mock.calls[0][0]).toEqual({
      date: today(),
      ex: 'EX-2026-7-APN',
      ifCode: 'IF-2026-8-APN',
      subject: 'Nota',
      department: 'DGO#PFA',
      forwarding: null,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sends only the edited fields', async () => {
    await openAs(officer);
    vi.mocked(recordsApi.update).mockResolvedValue(own);

    fireEvent.click(
      within(rowOf(own.ex)).getByRole('button', { name: 'Editar' }),
    );
    type('Pase', 'DGA#PFA');
    click('Confirmar');

    await screen.findByText('Registro actualizado.');
    expect(recordsApi.update).toHaveBeenCalledWith('r1', {
      forwarding: 'DGA#PFA',
    });
  });

  it('asks for confirmation before deleting', async () => {
    await openAs(officer);
    vi.mocked(recordsApi.remove).mockResolvedValue();

    fireEvent.click(
      within(rowOf(own.ex)).getByRole('button', { name: 'Eliminar' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(recordsApi.remove).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Eliminar' }));

    await screen.findByText('Registro eliminado.');
    expect(recordsApi.remove).toHaveBeenCalledWith('r1');
  });

  it('shows what changed in the history', async () => {
    await openAs(officer);
    const snapshot = { date: '2026-03-05', subject: 'Antes' };
    vi.mocked(recordsApi.history).mockResolvedValue([
      {
        id: 'a1',
        action: 'UPDATE',
        createdAt: '2026-03-06T12:00:00.000Z',
        before: snapshot,
        after: { ...snapshot, subject: 'Después' },
        performedBy: own.createdBy,
      },
    ]);

    fireEvent.click(
      within(rowOf(own.ex)).getByRole('button', { name: 'Historial' }),
    );

    const entry = await screen.findByRole('listitem', {
      name: (_name, element) => element.textContent!.startsWith('Motivo'),
    });
    expect(entry.textContent).toContain('Antes');
    expect(entry.textContent).toContain('Después');
    expect(screen.getByText('Modificación')).toBeTruthy();
  });

  it('copies EX without the clipboard API (plain HTTP) and says so', async () => {
    await openAs(officer, [own]);
    let copied = '';
    document.execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement | null)?.value ??
        document.querySelector('textarea')!.value;
      return true;
    });

    click('Copiar EX');

    expect(await screen.findByText('¡Copiado!')).toBeTruthy();
    expect(copied).toBe(own.ex);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
