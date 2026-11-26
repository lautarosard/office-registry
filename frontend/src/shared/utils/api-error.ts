import { isAxiosError } from 'axios';

// For these the API already answers with a user-facing Spanish message.
const MESSAGE_STATUSES = [400, 403, 404, 409, 429];

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string | string[] }>(err)) {
    if (!err.response) return 'No se pudo conectar con el servidor.';
    const { status, data } = err.response;
    if (MESSAGE_STATUSES.includes(status) && data?.message) {
      return [data.message].flat().join(' ');
    }
  }
  return fallback;
}
