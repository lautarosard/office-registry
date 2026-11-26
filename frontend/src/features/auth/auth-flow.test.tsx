import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { queryClient } from '../../shared/query-client';
import { storage } from '../../shared/utils/storage';
import { authService } from './services/auth.service';
import type { User } from './types';

vi.mock('./services/auth.service', () => ({
  authService: { login: vi.fn(), me: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../records/records.api', () => ({
  recordsApi: {
    list: vi.fn(() =>
      Promise.resolve({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      }),
    ),
  },
}));

const user: User = {
  id: '1',
  username: 'jperez',
  fullName: 'Juana Pérez',
  role: 'ADMIN',
  isActive: true,
  mustChangePassword: false,
};

const open = (path: string) => {
  window.history.pushState({}, '', path);
  render(<App />);
};

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('authentication flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it('sends a visitor without a session to the login page', async () => {
    open('/expedientes');

    expect(await screen.findByText('INICIAR SESIÓN')).toBeTruthy();
    expect(authService.me).not.toHaveBeenCalled();
  });

  it('restores the session on reload and shows name and role', async () => {
    storage.setToken('stored');
    vi.mocked(authService.me).mockResolvedValue(user);

    open('/expedientes');

    expect(await screen.findByText('Juana Pérez')).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
  });

  it('keeps a pending user on the change form until it succeeds', async () => {
    storage.setToken('temporary');
    vi.mocked(authService.me).mockResolvedValue({
      ...user,
      mustChangePassword: true,
    });
    vi.mocked(authService.changePassword).mockResolvedValue({
      accessToken: 'fresh',
      mustChangePassword: false,
    });

    open('/expedientes');

    expect(
      await screen.findByText(
        'Debe definir una contraseña propia antes de continuar.',
      ),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/change-password');

    type('Contraseña actual', 'Inicial123');
    type('Nueva contraseña', 'Definitiva456');
    type('Repetir nueva contraseña', 'Definitiva456');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/expedientes'));
    expect(authService.changePassword).toHaveBeenCalledWith({
      currentPassword: 'Inicial123',
      newPassword: 'Definitiva456',
    });
    expect(storage.getToken()).toBe('fresh');
  });

  it('redirects to the change form right after a first login', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'temporary',
      mustChangePassword: true,
    });
    vi.mocked(authService.me).mockResolvedValue({
      ...user,
      mustChangePassword: true,
    });

    open('/login');
    type('Usuario', 'jperez');
    type('Contraseña', 'Inicial123');
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() =>
      expect(window.location.pathname).toBe('/change-password'),
    );
  });
});
