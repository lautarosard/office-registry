const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-26" -> "26/11/2026". No Date object, so no timezone shifts. */
export const formatDay = (day: string) => day.split('-').reverse().join('/');

/** Today on this computer's clock, as YYYY-MM-DD. */
export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ISO timestamp -> "26/11/2026 14:05" in local time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "45675017" -> "45.675.017" */
export const formatDni = (dni: string) =>
  dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
