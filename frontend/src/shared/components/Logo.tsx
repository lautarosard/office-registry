import { useState } from 'react';
import { cn } from '../utils/cn';

/**
 * Institutional badge from `public/logo-pfa.png`. Until that file is added, a
 * plain "PFA" monogram is shown instead of a broken image.
 */
export function Logo({ className }: { className?: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span
        role="img"
        aria-label="Policía Federal Argentina"
        className={cn(
          'inline-flex size-14 items-center justify-center rounded-full border-2 border-gold text-sm font-bold text-gold',
          className,
        )}
      >
        PFA
      </span>
    );
  }

  return (
    <img
      src="/logo-pfa.png"
      alt="Policía Federal Argentina"
      className={cn('size-14 object-contain', className)}
      onError={() => setMissing(true)}
    />
  );
}
