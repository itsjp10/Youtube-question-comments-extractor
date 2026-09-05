import type { AnalysisStatus } from '../types';
import { STATUS_STYLES } from '../lib/classification';

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  const style = STATUS_STYLES[status];
  return <span className={`badge ${style.className}`}>{style.label}</span>;
}
