import { Link } from 'react-router-dom';
import type { AnalysisListItem } from '../types';
import { formatNumber, relativeTime } from '../lib/format';
import { StatusBadge } from './StatusBadge';

interface AnalysisHistoryTableProps {
  items: AnalysisListItem[];
  onDelete: (item: AnalysisListItem) => void;
}

function Thumb({ item }: { item: AnalysisListItem }) {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt=""
        className="h-10 w-16 shrink-0 rounded object-cover"
        loading="lazy"
      />
    );
  }
  return <div className="h-10 w-16 shrink-0 rounded bg-slate-100" />;
}

export function AnalysisHistoryTable({ items, onDelete }: AnalysisHistoryTableProps) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Video</th>
              <th className="px-4 py-3">Comentarios</th>
              <th className="px-4 py-3">FAQs</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb item={item} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {item.videoTitle ?? item.youtubeVideoId}
                      </p>
                      <p className="truncate text-xs text-slate-400">{item.channelTitle ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">
                  {formatNumber(item.totalComments)}
                  <span className="text-slate-400"> · {formatNumber(item.relevantComments)} rel.</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{formatNumber(item.faqCount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{relativeTime(item.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/analysis/${item.id}`} className="btn-secondary px-3 py-1.5">
                      Ver
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="btn-secondary px-3 py-1.5 text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex items-center gap-3">
              <Thumb item={item} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {item.videoTitle ?? item.youtubeVideoId}
                </p>
                <p className="truncate text-xs text-slate-400">{item.channelTitle ?? '—'}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{formatNumber(item.totalComments)} comentarios</span>
              <span>{formatNumber(item.faqCount)} FAQs</span>
              <span>{relativeTime(item.createdAt)}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link to={`/analysis/${item.id}`} className="btn-secondary flex-1 py-1.5">
                Ver
              </Link>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="btn-secondary flex-1 py-1.5 text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
