import { api } from '../services/api';
import { useAsync } from './useAsync';

export function useDashboardStats() {
  return useAsync(() => api.getDashboardStats(), []);
}
