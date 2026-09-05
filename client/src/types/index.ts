export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type CommentClassification =
  | 'QUESTION'
  | 'PROBLEM'
  | 'REQUEST'
  | 'OPINION'
  | 'THANKS'
  | 'SPAM'
  | 'OTHER';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: { message: string; details?: unknown };
}

export interface FAQComment {
  id: string;
  text: string;
  author: string | null;
  likeCount: number;
  publishedAt: string | null;
  classification: CommentClassification | null;
}

export interface FAQ {
  id: string;
  rank: number;
  representativeQuestion: string;
  frequency: number;
  score: number;
  comments: FAQComment[];
}

export interface AnalysisDetail {
  id: string;
  youtubeVideoId: string;
  videoUrl: string;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  viewCount: string | null;
  commentCount: number | null;
  publishedAt: string | null;
  status: AnalysisStatus;
  totalComments: number;
  relevantComments: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  stats: {
    totalComments: number;
    relevantComments: number;
    faqCount: number;
  };
  faqs: FAQ[];
}

export interface AnalysisListItem {
  id: string;
  youtubeVideoId: string;
  videoUrl: string;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  status: AnalysisStatus;
  totalComments: number;
  relevantComments: number;
  faqCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PreviousAnalysisRef {
  id: string;
  createdAt: string;
  videoTitle: string | null;
}

export interface CreateAnalysisResponse {
  duplicate: boolean;
  previousAnalysis: PreviousAnalysisRef | null;
  analysis: AnalysisDetail | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalAnalyses: number;
  videosAnalyzed: number;
  commentsProcessed: number;
  relevantCommentsProcessed: number;
  faqsDetected: number;
  byStatus: Partial<Record<AnalysisStatus, number>>;
}
