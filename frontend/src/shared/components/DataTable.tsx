import type { ReactNode } from 'react';
import { Button } from './Button';

/** Horizontally scrollable table with the grey header cells of docs/mock/. */
export function DataTable({
  caption,
  headings,
  children,
}: {
  caption: string;
  headings: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="w-full border-collapse text-sm text-gray-900">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b-2 border-gray-400 bg-canvas px-3 py-3 text-left text-xs font-bold tracking-wide whitespace-nowrap uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 [&_td]:px-3 [&_td]:py-2 [&_tr:hover]:bg-gray-50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-lg bg-white px-4 py-12 text-center text-gray-700 shadow"
    >
      {children}
    </p>
  );
}

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-4 text-red-800"
    >
      <p>{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
