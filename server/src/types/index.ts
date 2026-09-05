/**
 * Shared backend types. The Prisma-generated types cover persistence; these
 * describe the shapes that move between services and the transport layer.
 */

export type CommentIntent =
  | 'QUESTION'
  | 'PROBLEM'
  | 'REQUEST'
  | 'OPINION'
  | 'THANKS'
  | 'SPAM'
  | 'OTHER';

/** Intents that count as a FAQ candidate. */
export const RELEVANT_INTENTS: readonly CommentIntent[] = ['QUESTION', 'PROBLEM', 'REQUEST'];

export interface VideoMetadata {
  videoId: string;
  title: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  viewCount: string | null;
  commentCount: number | null;
  publishedAt: string | null; // ISO 8601
  commentsDisabled: boolean;
}

export interface RawComment {
  commentId: string;
  text: string;
  author: string | null;
  likeCount: number;
  publishedAt: string | null; // ISO 8601
}

export interface CleanComment extends RawComment {
  cleanText: string;
}

export interface CommentClassification {
  /** Index into the batch passed to `classifyComments`. */
  index: number;
  intent: CommentIntent;
  confidence: number;
}

export interface ClassifiedComment extends CleanComment {
  intent: CommentIntent;
  confidence: number;
}

export interface ClusterResult {
  representativeQuestion: string;
  frequency: number;
  score: number;
  comments: ClassifiedComment[];
}

export interface PipelineResult {
  totalComments: number;
  relevantComments: number;
  clusters: ClusterResult[];
  /** Every comment that was persisted, with its final intent + cluster index. */
  classifiedComments: Array<ClassifiedComment & { clusterIndex: number | null }>;
}
