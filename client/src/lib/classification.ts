import type { AnalysisStatus, CommentClassification } from '../types';

export const CLASSIFICATION_STYLES: Record<CommentClassification, { label: string; className: string }> = {
  QUESTION: { label: 'Pregunta', className: 'bg-brand-50 text-brand-700' },
  PROBLEM: { label: 'Problema', className: 'bg-amber-50 text-amber-700' },
  REQUEST: { label: 'Solicitud', className: 'bg-violet-50 text-violet-700' },
  OPINION: { label: 'Opinión', className: 'bg-slate-100 text-slate-600' },
  THANKS: { label: 'Agradecimiento', className: 'bg-emerald-50 text-emerald-700' },
  SPAM: { label: 'Spam', className: 'bg-red-50 text-red-700' },
  OTHER: { label: 'Otro', className: 'bg-slate-100 text-slate-600' },
};

export const STATUS_STYLES: Record<AnalysisStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' },
  PROCESSING: { label: 'Procesando', className: 'bg-brand-50 text-brand-700' },
  COMPLETED: { label: 'Completado', className: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Fallido', className: 'bg-red-50 text-red-700' },
};
