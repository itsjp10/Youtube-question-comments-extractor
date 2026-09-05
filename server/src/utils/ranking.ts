import type { ClassifiedComment } from '../types';

export interface ScoreInput {
  frequency: number;
  comments: ClassifiedComment[];
}

/**
 * Cluster score. Intentionally simple and easy to extend:
 *
 *   score = frequency + normalizedLikes
 *
 * `frequency` (how many semantically-similar comments) is the dominant term.
 * `normalizedLikes` is a small, saturating bonus so a heavily up-voted doubt
 * edges ahead of an equally-frequent one, without ever dominating frequency.
 */
export function computeClusterScore({ frequency, comments }: ScoreInput): number {
  const totalLikes = comments.reduce((sum, c) => sum + Math.max(0, c.likeCount), 0);
  const normalizedLikes = Math.round(Math.log10(1 + totalLikes) * 4);
  return frequency + normalizedLikes;
}

/** Rank descending by score, breaking ties by frequency then total likes. */
export function rankClusters<T extends { score: number; frequency: number; comments: ClassifiedComment[] }>(
  clusters: T[],
): T[] {
  return [...clusters].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    const likes = (x: T) => x.comments.reduce((s, c) => s + c.likeCount, 0);
    return likes(b) - likes(a);
  });
}
