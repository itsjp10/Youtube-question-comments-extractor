import { useState } from 'react';
import type { FAQ } from '../types';
import { formatNumber } from '../lib/format';
import { CLASSIFICATION_STYLES } from '../lib/classification';

interface FAQCardProps {
  faq: FAQ;
  defaultExpanded?: boolean;
}

const PREVIEW_COUNT = 5;

export function FAQCard({ faq, defaultExpanded = false }: FAQCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);

  const visibleComments = showAll ? faq.comments : faq.comments.slice(0, PREVIEW_COUNT);
  const hiddenCount = faq.comments.length - visibleComments.length;

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0 text-sm font-bold text-slate-300">#{faq.rank}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-slate-900">
            {faq.representativeQuestion}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>{formatNumber(faq.frequency)} menciones</span>
            <span className="text-slate-300">·</span>
            <span>Score: {formatNumber(faq.score)}</span>
          </span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`mt-1 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Comentarios relacionados
          </p>
          <ul className="space-y-2">
            {visibleComments.map((comment) => {
              const style = comment.classification
                ? CLASSIFICATION_STYLES[comment.classification]
                : null;
              return (
                <li key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-slate-700">“{comment.text}”</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {comment.author ? <span>{comment.author}</span> : null}
                    {comment.likeCount > 0 ? <span>▲ {formatNumber(comment.likeCount)}</span> : null}
                    {style ? <span className={`badge ${style.className}`}>{style.label}</span> : null}
                  </p>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver todos ({formatNumber(hiddenCount)} más)
            </button>
          ) : null}
          {showAll && faq.comments.length > PREVIEW_COUNT ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-3 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Ver menos
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
