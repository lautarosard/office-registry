import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal, ModalActions } from './Modal';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  isPending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  destructive,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} className="w-[min(30rem,calc(100vw-2rem))]">
      <div className="space-y-2 text-center text-sm">{children}</div>
      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-700">
          {error}
        </p>
      )}
      <ModalActions>
        <Button
          variant={destructive ? 'danger' : 'success'}
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? 'Procesando…' : confirmLabel}
        </Button>
        {/* Focused by default, so Enter doesn't confirm by accident. */}
        <Button variant="secondary" data-autofocus onClick={onCancel}>
          Cancelar
        </Button>
      </ModalActions>
    </Modal>
  );
}
