import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { AnalysisHistoryTable } from '../components/AnalysisHistoryTable';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useAnalyses } from '../hooks/useAnalyses';
import { api } from '../services/api';
import type { AnalysisListItem } from '../types';

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useAnalyses(page);

  const [target, setTarget] = useState<AnalysisListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAnalysis(target.id);
      setTarget(null);
      // Step back a page if we just removed the last row on it.
      if (data && data.items.length === 1 && page > 1) setPage((p) => p - 1);
      else refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Historial"
        description="Todos los análisis realizados, del más reciente al más antiguo."
        actions={
          <Link to="/" className="btn-primary">
            Nuevo análisis
          </Link>
        }
      />

      {loading ? (
        <div className="card divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="h-10 w-16 animate-pulse rounded bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/5 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Aún no hay análisis"
          description="Analiza tu primer video de YouTube para ver aquí el historial."
          action={
            <Link to="/" className="btn-primary">
              Analizar un video
            </Link>
          }
        />
      ) : (
        <>
          {deleteError ? <ErrorState message={deleteError} compact /> : null}
          <AnalysisHistoryTable items={data.items} onDelete={setTarget} />

          {data.totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <span className="text-slate-500">
                Página {data.page} de {data.totalPages} · {data.total} análisis
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDeleteModal
        open={target !== null}
        loading={deleting}
        description={
          target
            ? `Se eliminará el análisis de "${target.videoTitle ?? target.youtubeVideoId}", junto con sus comentarios y FAQs. Esta acción no se puede deshacer.`
            : undefined
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) {
            setTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
