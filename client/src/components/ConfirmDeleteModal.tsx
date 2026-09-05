import { useEffect } from 'react';
import { Spinner } from './Spinner';

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  open,
  title = 'Eliminar análisis',
  description = 'Se eliminarán también los comentarios y las FAQs asociadas. Esta acción no se puede deshacer.',
  confirmLabel = 'Eliminar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={loading ? undefined : onCancel} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="card relative w-full max-w-md p-5">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
