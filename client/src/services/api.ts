import axios, { AxiosError } from 'axios';
import type {
  AnalysisDetail,
  AnalysisListItem,
  ApiSuccess,
  CreateAnalysisResponse,
  DashboardStats,
  Paginated,
} from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const http = axios.create({ baseURL, timeout: 180_000 });

/** Normalised error thrown by every api.* call. */
export class ApiRequestError extends Error {
  readonly status?: number;
  readonly details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

function toApiError(err: unknown): ApiRequestError {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: { message?: string; details?: unknown } } | undefined;
    if (data?.error?.message) {
      return new ApiRequestError(data.error.message, err.response?.status, data.error.details);
    }
    if (err.code === 'ECONNABORTED') {
      return new ApiRequestError('The request timed out. The analysis may still be running.', 408);
    }
    if (err.code === 'ERR_NETWORK') {
      return new ApiRequestError('Could not reach the API. Is the backend running?', undefined);
    }
    return new ApiRequestError(err.message, err.response?.status);
  }
  return new ApiRequestError(err instanceof Error ? err.message : 'Unexpected error');
}

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<{ data: T; meta?: Record<string, unknown> }> {
  try {
    const res = await promise;
    return { data: res.data.data, meta: res.data.meta };
  } catch (err) {
    throw toApiError(err);
  }
}

export const api = {
  async createAnalysis(videoUrl: string, force = false): Promise<CreateAnalysisResponse> {
    const { data } = await unwrap<CreateAnalysisResponse>(
      http.post('/analyses', { videoUrl, force }),
    );
    return data;
  },

  async listAnalyses(page = 1, limit = 20): Promise<Paginated<AnalysisListItem>> {
    const { data, meta } = await unwrap<AnalysisListItem[]>(
      http.get('/analyses', { params: { page, limit } }),
    );
    return {
      items: data,
      page: Number(meta?.page ?? page),
      limit: Number(meta?.limit ?? limit),
      total: Number(meta?.total ?? data.length),
      totalPages: Number(meta?.totalPages ?? 1),
    };
  },

  async getAnalysis(id: string): Promise<AnalysisDetail> {
    const { data } = await unwrap<AnalysisDetail>(http.get(`/analyses/${id}`));
    return data;
  },

  async deleteAnalysis(id: string): Promise<void> {
    await unwrap(http.delete(`/analyses/${id}`));
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await unwrap<DashboardStats>(http.get('/dashboard/stats'));
    return data;
  },
};
