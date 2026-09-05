import { api } from '../services/api';
import { useAsync } from './useAsync';

export function useAnalyses(page: number, limit = 20) {
  return useAsync(() => api.listAnalyses(page, limit), [page, limit]);
}

export function useAnalysis(id: string) {
  return useAsync(() => api.getAnalysis(id), [id]);
}
