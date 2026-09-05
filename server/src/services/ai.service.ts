import { getAIProvider, type AIProvider } from '../providers';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { chunk, mapWithConcurrency } from '../utils/concurrency';
import type { CommentClassification, CommentIntent } from '../types';

/**
 * Application-facing AI layer. Adds batching, bounded concurrency and safe
 * fallbacks on top of whatever `AIProvider` is configured, so the rest of the
 * app never worries about request limits.
 */
class AIService {
  get provider(): AIProvider {
    return getAIProvider();
  }

  /** Classify every text, batching by `AI_CLASSIFY_BATCH_SIZE`. */
  async classifyComments(texts: string[]): Promise<CommentClassification[]> {
    if (texts.length === 0) return [];

    const batches = chunk(texts, env.AI_CLASSIFY_BATCH_SIZE);
    const perBatch = await mapWithConcurrency(batches, 3, async (batch, batchIndex) => {
      const offset = batchIndex * env.AI_CLASSIFY_BATCH_SIZE;
      try {
        const res = await this.provider.classifyComments(batch);
        return res.map((c) => ({ ...c, index: c.index + offset }));
      } catch (err) {
        throw wrapProviderError(err, 'classification');
      }
    });

    const flat = perBatch.flat();
    const byIndex = new Map<number, CommentClassification>();
    for (const c of flat) byIndex.set(c.index, c);

    return texts.map(
      (_, index) =>
        byIndex.get(index) ?? { index, intent: 'OTHER' as CommentIntent, confidence: 0.3 },
    );
  }

  /** Embed every text, using native batch embeddings when the provider supports them. */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const provider = this.provider;

    try {
      if (provider.generateEmbeddings) {
        const batches = chunk(texts, env.AI_EMBEDDING_BATCH_SIZE);
        const perBatch = await mapWithConcurrency(batches, 3, (batch) =>
          provider.generateEmbeddings!(batch),
        );
        return perBatch.flat();
      }
      return await mapWithConcurrency(texts, 5, (t) => provider.generateEmbedding(t));
    } catch (err) {
      throw wrapProviderError(err, 'embeddings');
    }
  }

  async generateRepresentativeQuestion(comments: string[]): Promise<string> {
    if (comments.length === 0) return 'Pregunta frecuente';
    try {
      const q = await this.provider.generateRepresentativeQuestion(comments);
      return q?.trim() || fallbackQuestion(comments);
    } catch (err) {
      // A single failed question should not sink the whole analysis.
      if (env.NODE_ENV === 'development') {
        console.warn('[ai] representative question failed, using fallback:', (err as Error).message);
      }
      return fallbackQuestion(comments);
    }
  }
}

function fallbackQuestion(comments: string[]): string {
  const shortest = [...comments].sort((a, b) => a.length - b.length)[0] ?? 'Pregunta frecuente';
  const trimmed = shortest.trim().replace(/\s+/g, ' ').slice(0, 140);
  return /[?¿]/.test(trimmed) ? trimmed : `${trimmed}?`;
}

function wrapProviderError(err: unknown, stage: string): ApiError {
  if (err instanceof ApiError) return err;
  return ApiError.badGateway(
    `AI provider failed during ${stage}: ${(err as Error)?.message ?? 'unknown error'}`,
  );
}

export const aiService = new AIService();
