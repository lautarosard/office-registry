import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** false: Escape doesn't close it (the content must not be lost). */
  dismissible?: boolean;
}

/**
 * Native modal <dialog>: the browser provides the focus trap and makes the page
 * behind it inert. Mount it to open it, unmount it to close it.
 */
export function Modal({
  title,
  onClose,
  children,
  className,
  dismissible = true,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        'm-auto max-h-[calc(100vh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-lg bg-gray-100 p-6 text-gray-900 shadow-xl backdrop:bg-black/60 sm:p-8',
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      // The browser can force-close a dialog; keep React's state in step.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
    >
      <h2
        id={titleId}
        className="mb-5 text-center text-xl font-bold tracking-wide uppercase"
      >
        {title}
      </h2>
      {children}
    </dialog>
  );
}

/** Gold rule plus the action buttons, as in docs/mock/. */
export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-4 border-t-2 border-gold pt-5">
      {children}
    </div>
  );
}
