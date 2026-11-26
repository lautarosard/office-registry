import { Button } from '../../../shared/components/Button';
import { CopyButton } from '../../../shared/components/CopyButton';
import { Modal, ModalActions } from '../../../shared/components/Modal';

export function TemporaryPasswordModal({
  username,
  password,
  onClose,
}: {
  username: string;
  password: string;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Contraseña temporal"
      onClose={onClose}
      dismissible={false}
      className="w-[min(32rem,calc(100vw-2rem))]"
    >
      <p className="text-center text-sm">
        Usuario: <span className="font-semibold">{username}</span>
      </p>
      <div className="mt-3 flex items-center justify-center gap-3 rounded-md border border-gray-500 bg-white p-3">
        <output
          aria-label="Contraseña temporal generada"
          className="font-mono text-xl tracking-wider select-all"
        >
          {password}
        </output>
        <CopyButton value={password} label="Copiar contraseña" text="Copiar" />
      </div>
      <p className="mt-4 rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Anótela o cópiela ahora: no se volverá a mostrar.</strong> El
        usuario deberá cambiarla al iniciar sesión.
      </p>
      <ModalActions>
        <Button variant="success" onClick={onClose}>
          Ya la guardé, cerrar
        </Button>
      </ModalActions>
    </Modal>
  );
}
