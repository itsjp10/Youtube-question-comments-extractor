import { formatNumber } from '../lib/format';

export interface StatItem {
  label: string;
  value: number | string;
  hint?: string;
}

interface StatsCardsProps {
  items: StatItem[];
  loading?: boolean;
}

export function StatsCards({ items, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {typeof item.value === 'number' ? formatNumber(item.value) : item.value}
            </p>
          )}
          {item.hint ? <p className="mt-1 text-xs text-slate-400">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}
