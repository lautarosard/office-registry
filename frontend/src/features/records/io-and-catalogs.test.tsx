import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
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
import { authService } from '../auth/services/auth.service';
import type { User } from '../auth/types';
import { recordsApi } from './records.api';
import type { ImportReport } from './types';

vi.mock('../auth/services/auth.service', () => ({
  authService: { login: vi.fn(), me: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('./records.api', () => ({
  recordsApi: {
    list: vi.fn(),
    create: vi.fn(),
    catalogs: vi.fn(),
    export: vi.fn(),
    template: vi.fn(),
    import: vi.fn(),
  },
}));

const report = (overrides: Partial<ImportReport> = {}): ImportReport => ({
  totalRows: 3,
  validCount: 2,
  invalidCount: 1,
  duplicateCount: 0,
  errors: [{ row: 3, field: 'department', message: 'Ingrese la repartición.' }],
  importedCount: 0,
  ...overrides,
});

async function openAs(user: User) {
  vi.mocked(authService.me).mockResolvedValue(user);
  vi.mocked(recordsApi.list).mockResolvedValue(pageOf([record()]));
  vi.mocked(recordsApi.catalogs).mockResolvedValue({
    subjects: ['Licencia anual'],
    departments: ['DGO#PFA', 'DGA#PFA'],
    forwardings: ['Archivo'],
  });
  storage.setToken('token');
  openApp('/expedientes');
  await screen.findByRole('table');
}

const suggestionsOf = (label: string) => {
  const input = screen.getByLabelText<HTMLInputElement>(label);
  return Array.from(input.list?.options ?? [], (option) => option.value);
};

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText('Archivo .xlsx o .csv (máximo 5 MB)'), {
    target: { files: [file] },
  });

const spreadsheet = new File(['datos'], 'planilla.csv', { type: 'text/csv' });
const inDialog = () => within(screen.getByRole('dialog'));

describe('autocomplete', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApp();
  });

  it('suggests values already in use and still accepts new ones', async () => {
    await openAs(officer);
    vi.mocked(recordsApi.create).mockResolvedValue(record());

    click('Nuevo registro');

    await waitFor(() =>
      expect(suggestionsOf('Repartición')).toEqual(['DGO#PFA', 'DGA#PFA']),
    );
    expect(suggestionsOf('Motivo')).toEqual(['Licencia anual']);
    expect(suggestionsOf('Pase')).toEqual(['Archivo']);

    type('EX', 'EX-2026-1-APN');
    type('IF', 'IF-2026-2-APN');
    type('Motivo', 'Algo nunca visto');
    type('Repartición', 'NUEVA#PFA');
    click('Confirmar');

    await screen.findByText('Registro creado.');
    expect(vi.mocked(recordsApi.create).mock.calls[0][0]).toMatchObject({
      subject: 'Algo nunca visto',
      department: 'NUEVA#PFA',
    });
  });
});

describe('export and import controls', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApp();
  });

  it('are hidden from a USER', async () => {
    await openAs(officer);

    expect(screen.queryByRole('button', { name: 'Exportar' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Importar planilla' }),
    ).toBeNull();
  });

  it('exports with the current filters and the chosen format', async () => {
    await openAs(admin);
    vi.mocked(recordsApi.export).mockResolvedValue();

    type('Buscar', ' dgo ');
    type('Desde', '2026-01-01');
    type('Formato de exportación', 'csv');
    click('Exportar');

    await waitFor(() =>
      expect(recordsApi.export).toHaveBeenCalledWith(
        { q: 'dgo', from: '2026-01-01', to: '' },
        'csv',
      ),
    );
  });

  it('says when the export fails', async () => {
    await openAs(admin);
    vi.mocked(recordsApi.export).mockRejectedValue(new AxiosError('Network'));

    click('Exportar');

    expect(
      await screen.findByText('No se pudo conectar con el servidor.'),
    ).toBeTruthy();
  });

  it('previews errors, then imports only after confirmation', async () => {
    await openAs(admin);
    vi.mocked(recordsApi.import).mockImplementation((_file, dryRun) =>
      Promise.resolve(report({ importedCount: dryRun ? 0 : 2 })),
    );

    click('Importar planilla');
    expect(inDialog().getByRole('button', { name: 'Importar' })).toHaveProperty(
      'disabled',
      true,
    );
    chooseFile(spreadsheet);

    expect(await screen.findByText('Ingrese la repartición.')).toBeTruthy();
    expect(inDialog().getByText('no se importarán')).toBeTruthy();
    expect(recordsApi.import).toHaveBeenCalledTimes(1);
    expect(recordsApi.import).toHaveBeenLastCalledWith(spreadsheet, true);

    click('Importar 2 registros');

    expect(
      await screen.findByText(
        'Importación terminada: 2 registros. Se omitió 1 fila.',
      ),
    ).toBeTruthy();
    expect(recordsApi.import).toHaveBeenLastCalledWith(spreadsheet, false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('warns about duplicates and blocks a file with no valid rows', async () => {
    await openAs(admin);
    vi.mocked(recordsApi.import).mockResolvedValue(
      report({ validCount: 0, invalidCount: 3, duplicateCount: 2 }),
    );

    click('Importar planilla');
    chooseFile(spreadsheet);

    expect(await screen.findByText(/ya figura/)).toBeTruthy();
    expect(inDialog().getByRole('button', { name: 'Importar' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('shows why the server refused a file', async () => {
    await openAs(admin);
    const config = { headers: new AxiosHeaders() };
    vi.mocked(recordsApi.import).mockRejectedValue(
      new AxiosError('400', undefined, config, null, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config,
        data: { message: 'Faltan columnas en la planilla: IF.' },
      }),
    );

    click('Importar planilla');
    chooseFile(spreadsheet);

    expect(
      await screen.findByText('Faltan columnas en la planilla: IF.'),
    ).toBeTruthy();
  });

  it('refuses an oversized file without uploading it', async () => {
    await openAs(admin);
    const huge = new File(['x'], 'grande.csv');
    Object.defineProperty(huge, 'size', { value: 5 * 1024 * 1024 + 1 });

    click('Importar planilla');
    chooseFile(huge);

    expect(
      await screen.findByText('El archivo supera el máximo de 5 MB.'),
    ).toBeTruthy();
    expect(recordsApi.import).not.toHaveBeenCalled();
  });

  it('downloads the template', async () => {
    await openAs(admin);
    vi.mocked(recordsApi.template).mockResolvedValue();

    click('Importar planilla');
    click('Plantilla Excel');

    await waitFor(() =>
      expect(recordsApi.template).toHaveBeenCalledWith('xlsx'),
    );
  });
});
