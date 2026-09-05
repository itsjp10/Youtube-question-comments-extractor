import type { CommentClassification } from '../types';

/**
 * The seam every AI backend implements. Nothing outside `providers/` and
 * `ai.service.ts` should know which concrete provider is active.
 *
 * Swapping providers is a one-line change in `.env` (`AI_PROVIDER=...`).
 */
export interface AIProvider {
  /** Human-readable id, e.g. "openai" — used only for logging. */
  readonly name: string;

  /**
   * `'semantic'`  — real embedding model; cosine of paraphrases is high (~0.85).
   * `'lexical'`   — cheap local vectors; paraphrase cosine is lower (~0.3).
   * The clustering service uses this to pick a sane distance threshold.
   */
  readonly embeddingKind: 'semantic' | 'lexical';

  /**
   * When set, overrides `CLUSTER_SIMILARITY_THRESHOLD` for this provider.
   * (The heuristic provider needs a much lower threshold than an embedding API.)
   */
  readonly defaultSimilarityThreshold?: number;

  /**
   * Classify a batch of raw comment strings. The returned array's `index`
   * refers to the position in the input array; every input MUST get exactly
   * one classification.
   */
  classifyComments(comments: string[]): Promise<CommentClassification[]>;

  /** Embed a single string. */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Optional batch embedding. When absent, `ai.service` falls back to calling
   * `generateEmbedding` with limited concurrency.
   */
  generateEmbeddings?(texts: string[]): Promise<number[][]>;

  /** Produce one representative question for a group of similar comments. */
  generateRepresentativeQuestion(comments: string[]): Promise<string>;
}
