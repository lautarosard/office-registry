import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  admin,
  click,
  officer,
  openApp,
  pageOf,
  resetApp,
  type,
} from '../../test/app';
import { storage } from '../../shared/utils/storage';
import { authService } from '../auth/services/auth.service';
import { recordsApi } from '../records/records.api';
import type { UserAccount } from './types';
import { usersApi } from './users.api';

vi.mock('../auth/services/auth.service', () => ({
  authService: { login: vi.fn(), me: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../records/records.api', () => ({ recordsApi: { list: vi.fn() } }));
vi.mock('./users.api', () => ({
  usersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const account = (overrides: Partial<UserAccount>): UserAccount => ({
  id: officer.id,
  dni: '45675017',
  username: officer.username,
  fullName: officer.fullName,
  role: 'USER',
  isActive: true,
  mustChangePassword: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const self = account({
  id: admin.id,
  dni: '30111222',
  username: admin.username,
  fullName: admin.fullName,
  role: 'ADMIN',
});
const other = account({});

async function openUsers() {
  vi.mocked(authService.me).mockResolvedValue(admin);
  vi.mocked(usersApi.list).mockResolvedValue({
    data: [self, other],
    meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
  });
  storage.setToken('token');
  openApp('/usuarios');
  await screen.findByRole('table');
}

const rowOf = (username: string) =>
  within(screen.getByRole('cell', { name: username }).closest('tr')!);
const button = (username: string, name: string) =>
  rowOf(username).getByRole<HTMLButtonElement>('button', { name });
const inDialog = (name: string) =>
  within(screen.getByRole('dialog')).getByRole('button', { name });

describe('Usuarios', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetApp();
  });

  it('sends a non-admin back to Expedientes', async () => {
    vi.mocked(authService.me).mockResolvedValue(officer);
    vi.mocked(recordsApi.list).mockResolvedValue(pageOf([]));
    storage.setToken('token');

    openApp('/usuarios');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/expedientes'),
    );
    expect(usersApi.list).not.toHaveBeenCalled();
  });

  it('lists accounts and protects the admin’s own', async () => {
    await openUsers();

    expect(screen.getByText('45.675.017')).toBeTruthy();
    expect(rowOf(other.username).getByText('Activo')).toBeTruthy();
    expect(button(self.username, 'Desactivar').disabled).toBe(true);
    expect(button(self.username, 'Restablecer contraseña').disabled).toBe(true);
    expect(button(other.username, 'Desactivar').disabled).toBe(false);
  });

  it('creates a user and shows the temporary password once', async () => {
    await openUsers();
    vi.mocked(usersApi.create).mockResolvedValue({
      ...other,
      temporaryPassword: 'Abc234def567',
    });

    click('Nuevo usuario');
    type('DNI', '28.000.111');
    type('Usuario', 'nuevo');
    type('Nombre', 'Persona Nueva');
    type('Rol', 'ADMIN');
    click('Confirmar');

    expect(await screen.findByText('Abc234def567')).toBeTruthy();
    expect(screen.getByText(/no se volverá a mostrar/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar contraseña' })).toBeTruthy();
    expect(vi.mocked(usersApi.create).mock.calls[0][0]).toEqual({
      dni: '28000111',
      username: 'nuevo',
      fullName: 'Persona Nueva',
      role: 'ADMIN',
    });

    click('Ya la guardé, cerrar');
    expect(screen.queryByText('Abc234def567')).toBeNull();
  });

  it('validates the DNI', async () => {
    await openUsers();

    click('Nuevo usuario');
    type('DNI', '12');
    click('Confirmar');

    expect(
      await screen.findByText('El DNI debe tener 7 u 8 dígitos.'),
    ).toBeTruthy();
    expect(usersApi.create).not.toHaveBeenCalled();
  });

  it('resets a password only after confirmation', async () => {
    await openUsers();
    vi.mocked(usersApi.resetPassword).mockResolvedValue({
      temporaryPassword: 'Zyx987wvu654',
    });

    fireEvent.click(button(other.username, 'Restablecer contraseña'));
    expect(usersApi.resetPassword).not.toHaveBeenCalled();
    fireEvent.click(inDialog('Restablecer'));

    expect(await screen.findByText('Zyx987wvu654')).toBeTruthy();
    expect(usersApi.resetPassword).toHaveBeenCalledWith(other.id);
  });

  it('confirms before deactivating', async () => {
    await openUsers();
    vi.mocked(usersApi.update).mockResolvedValue({
      ...other,
      isActive: false,
    });

    fireEvent.click(button(other.username, 'Desactivar'));
    expect(usersApi.update).not.toHaveBeenCalled();
    fireEvent.click(inDialog('Desactivar'));

    expect(
      await screen.findByText(`Usuario ${other.username} desactivado.`),
    ).toBeTruthy();
    expect(usersApi.update).toHaveBeenCalledWith(other.id, {
      isActive: false,
    });
  });
});
