import type { AnalysisDetail } from '../types';
import { formatNumber, formatDate } from '../lib/format';
import { StatusBadge } from './StatusBadge';

interface VideoSummaryProps {
  analysis: AnalysisDetail;
}

export function VideoSummary({ analysis }: VideoSummaryProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {analysis.thumbnailUrl ? (
          <a
            href={analysis.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-64"
          >
            <img
              src={analysis.thumbnailUrl}
              alt={analysis.videoTitle ?? 'Miniatura del video'}
              className="aspect-video w-full object-cover"
              loading="lazy"
            />
          </a>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-snug text-slate-900">
              {analysis.videoTitle ?? 'Video de YouTube'}
            </h2>
            <StatusBadge status={analysis.status} />
          </div>

          {analysis.channelTitle ? (
            <p className="mt-1 text-sm text-slate-500">Canal: {analysis.channelTitle}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <span>
              <strong className="font-semibold text-slate-900">
                {formatNumber(analysis.totalComments)}
              </strong>{' '}
              comentarios analizados
            </span>
            <span>
              <strong className="font-semibold text-slate-900">
                {formatNumber(analysis.relevantComments)}
              </strong>{' '}
              comentarios relevantes
            </span>
            {analysis.viewCount ? <span>{formatNumber(analysis.viewCount)} vistas</span> : null}
            {analysis.publishedAt ? <span>Publicado {formatDate(analysis.publishedAt)}</span> : null}
          </div>

          <a
            href={analysis.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Ver en YouTube ↗
          </a>
        </div>
      </div>

      {analysis.status === 'FAILED' && analysis.errorMessage ? (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          {analysis.errorMessage}
        </div>
      ) : null}
    </div>
  );
}
