import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatsCards } from '../components/StatsCards';
import { VideoUrlForm } from '../components/VideoUrlForm';
import { LoadingAnalysis } from '../components/LoadingAnalysis';
import { VideoSummary } from '../components/VideoSummary';
import { FAQList } from '../components/FAQList';
import { ErrorState } from '../components/ErrorState';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { api } from '../services/api';
import type { AnalysisDetail, PreviousAnalysisRef } from '../types';
import { formatDateTime } from '../lib/format';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'duplicate'; previous: PreviousAnalysisRef; url: string }
  | { kind: 'done'; analysis: AnalysisDetail; previous: PreviousAnalysisRef | null }
  | { kind: 'error'; message: string; url: string };

export function DashboardPage() {
  const stats = useDashboardStats();
  const [state, setState] = useState<State>({ kind: 'idle' });

  const run = async (url: string, force: boolean) => {
    setState({ kind: 'loading' });
    try {
      const res = await api.createAnalysis(url, force);
      if (res.duplicate && res.previousAnalysis) {
        setState({ kind: 'duplicate', previous: res.previousAnalysis, url });
        return;
      }
      if (res.analysis) {
        setState({ kind: 'done', analysis: res.analysis, previous: res.previousAnalysis });
        stats.refetch();
      } else {
        setState({ kind: 'error', message: 'La respuesta del servidor no incluyó resultados.', url });
      }
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Error inesperado',
        url,
      });
    }
  };

  const statItems = [
    { label: 'Total análisis', value: stats.data?.totalAnalyses ?? 0 },
    { label: 'Videos analizados', value: stats.data?.videosAnalyzed ?? 0 },
    { label: 'Comentarios procesados', value: stats.data?.commentsProcessed ?? 0 },
    { label: 'FAQs detectadas', value: stats.data?.faqsDetected ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          YouTube Comment Analyzer
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Descubre las preguntas más frecuentes de tu audiencia.
        </p>
      </div>

      <StatsCards items={statItems} loading={stats.loading} />

      <section id="analyze" className="card scroll-mt-6 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Analizar un video</h2>
        <VideoUrlForm
          onSubmit={(url) => run(url, false)}
          loading={state.kind === 'loading'}
          initialValue={
            state.kind === 'error' || state.kind === 'duplicate' ? state.url : ''
          }
        />
      </section>

      {state.kind === 'loading' ? <LoadingAnalysis /> : null}

      {state.kind === 'error' ? (
        <ErrorState message={state.message} onRetry={() => run(state.url, false)} compact />
      ) : null}

      {state.kind === 'duplicate' ? (
        <div className="card border-brand-200 bg-brand-50/50 p-5">
          <p className="text-sm font-semibold text-slate-900">
            Este video ya fue analizado anteriormente.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Último análisis: {formatDateTime(state.previous.createdAt)}
            {state.previous.videoTitle ? ` · ${state.previous.videoTitle}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/analysis/${state.previous.id}`} className="btn-primary">
              Ver análisis anterior
            </Link>
            <button type="button" className="btn-secondary" onClick={() => run(state.url, true)}>
              Analizar nuevamente
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === 'done' ? (
        <section className="space-y-5">
          {state.previous ? (
            <p className="text-xs text-slate-400">
              Se generó un nuevo análisis (ya existía uno del {formatDateTime(state.previous.createdAt)}).
            </p>
          ) : null}
          <VideoSummary analysis={state.analysis} />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Preguntas más frecuentes</h2>
            <FAQList faqs={state.analysis.faqs} relevantComments={state.analysis.relevantComments} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/analysis/${state.analysis.id}`} className="btn-secondary">
              Abrir página de detalle
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setState({ kind: 'idle' })}>
              Analizar otro video
            </button>
          </div>
        </section>
      ) : null}

      {state.kind === 'idle' ? (
        <p className="text-center text-sm text-slate-400">
          El análisis obtiene los comentarios del video, detecta dudas y problemas, y los agrupa en
          preguntas frecuentes ordenadas por popularidad.
        </p>
      ) : null}
    </div>
  );
}
