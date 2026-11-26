import { useEffect, useState } from 'react';
import { copyText } from '../utils/clipboard';

interface CopyButtonProps {
  value: string;
  /** Accessible name, e.g. "Copiar EX". */
  label: string;
  /** Visible text next to the icon. */
  text?: string;
}

export function CopyButton({ value, label, text }: CopyButtonProps) {
  const [result, setResult] = useState<'copied' | 'failed' | null>(null);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 2000);
    return () => clearTimeout(timer);
  }, [result]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-navy-800 focus-visible:ring-2 focus-visible:ring-navy-800 focus-visible:outline-none"
        onClick={async (event) => {
          const host = event.currentTarget.parentElement ?? undefined;
          setResult((await copyText(value, host)) ? 'copied' : 'failed');
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {result === 'copied' ? (
            <path d="M5 13l4 4L19 7" />
          ) : (
            <>
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 012-2h10" />
            </>
          )}
        </svg>
        {text && <span className="text-sm">{text}</span>}
      </button>
      <span
        role="status"
        className={
          result
            ? 'absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 font-sans text-xs whitespace-nowrap text-white'
            : 'sr-only'
        }
      >
        {result === 'copied' && '¡Copiado!'}
        {result === 'failed' && 'No se pudo copiar'}
      </span>
    </span>
  );
}
