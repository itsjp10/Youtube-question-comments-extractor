import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VideoSummary } from '../components/VideoSummary';
import { FAQList } from '../components/FAQList';
import { StatsCards } from '../components/StatsCards';
import { ErrorState } from '../components/ErrorState';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useAnalysis } from '../hooks/useAnalyses';
import { api } from '../services/api';

export function AnalysisDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAnalysis(id);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAnalysis(id);
      navigate('/history');
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/history" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        ← Volver al historial
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="card h-44 animate-pulse bg-slate-50" />
          <div className="card h-24 animate-pulse bg-slate-50" />
        </div>
      ) : error ? (
        <ErrorState
          message={error.includes('not found') || error.includes('no encontrad') ? 'Este análisis no existe o fue eliminado.' : error}
          onRetry={refetch}
        />
      ) : data ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {data.videoTitle ?? 'Detalle del análisis'}
            </h1>
            <button
              type="button"
              className="btn-secondary shrink-0 text-red-600 hover:bg-red-50"
              onClick={() => setConfirming(true)}
            >
              Eliminar
            </button>
          </div>

          <VideoSummary analysis={data} />

          {data.status === 'COMPLETED' ? (
            <>
              <StatsCards
                items={[
                  { label: 'Comentarios analizados', value: data.stats.totalComments },
                  { label: 'Comentarios relevantes', value: data.stats.relevantComments },
                  { label: 'FAQs detectadas', value: data.stats.faqCount },
                ]}
              />
              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Preguntas más frecuentes</h2>
                <FAQList faqs={data.faqs} relevantComments={data.relevantComments} />
              </div>
            </>
          ) : data.status === 'FAILED' ? (
            <ErrorState
              message={data.errorMessage ?? 'El análisis falló.'}
              compact
            />
          ) : (
            <p className="text-sm text-slate-500">Este análisis todavía está en proceso.</p>
          )}
        </>
      ) : null}

      <ConfirmDeleteModal
        open={confirming}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirming(false)}
      />
    </div>
  );
}
