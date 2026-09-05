import { aiService } from './ai.service';
import { env } from '../config/env';
import { computeClusterScore, rankClusters } from '../utils/ranking';
import type { ClassifiedComment, ClusterResult } from '../types';

/** Hard cap on how many comments enter the O(n^2) clustering step. */
const MAX_CLUSTERING_INPUT = 800;

interface DbscanOptions {
  similarityThreshold: number;
  minPoints: number;
}

/**
 * Steps 5-7 of the pipeline:
 *   embeddings -> semantic clustering (DBSCAN over cosine similarity)
 *   -> one representative question per cluster -> score + ranking.
 */
class ClusteringService {
  async clusterComments(relevant: ClassifiedComment[]): Promise<ClusterResult[]> {
    if (relevant.length === 0) return [];

    // If there is a single relevant comment there is nothing to cluster, but it
    // is still a (tiny) FAQ worth showing.
    if (relevant.length === 1) {
      const question = await aiService.generateRepresentativeQuestion([relevant[0].cleanText]);
      return [
        {
          representativeQuestion: question,
          frequency: 1,
          score: computeClusterScore({ frequency: 1, comments: relevant }),
          comments: relevant,
        },
      ];
    }

    const input = this.selectInput(relevant);
    const vectors = await aiService.embedTexts(input.map((c) => c.cleanText));

    // An explicit CLUSTER_SIMILARITY_THRESHOLD always wins; otherwise the active
    // provider decides (lexical vs semantic embeddings need very different values).
    const threshold = env.CLUSTER_SIMILARITY_THRESHOLD_SET
      ? env.CLUSTER_SIMILARITY_THRESHOLD
      : aiService.provider.defaultSimilarityThreshold ?? env.CLUSTER_SIMILARITY_THRESHOLD;

    const labels = dbscan(vectors, {
      similarityThreshold: threshold,
      minPoints: Math.max(1, env.CLUSTER_MIN_POINTS),
    });

    // Group comment indices by cluster label (ignore noise = -1).
    const groups = new Map<number, ClassifiedComment[]>();
    labels.forEach((label, i) => {
      if (label < 0) return;
      const bucket = groups.get(label) ?? [];
      bucket.push(input[i]);
      groups.set(label, bucket);
    });

    if (groups.size === 0) return [];

    const clusters = await Promise.all(
      [...groups.values()].map(async (comments) => {
        const ordered = [...comments].sort((a, b) => b.likeCount - a.likeCount || b.confidence - a.confidence);
        const representativeQuestion = await aiService.generateRepresentativeQuestion(
          ordered.slice(0, 12).map((c) => c.cleanText),
        );
        const frequency = comments.length;
        return {
          representativeQuestion,
          frequency,
          score: computeClusterScore({ frequency, comments }),
          comments: ordered,
        } satisfies ClusterResult;
      }),
    );

    return rankClusters(clusters);
  }

  /** Keep clustering tractable: prefer the most up-voted / confident comments. */
  private selectInput(relevant: ClassifiedComment[]): ClassifiedComment[] {
    if (relevant.length <= MAX_CLUSTERING_INPUT) return relevant;
    return [...relevant]
      .sort((a, b) => b.likeCount - a.likeCount || b.confidence - a.confidence)
      .slice(0, MAX_CLUSTERING_INPUT);
  }
}

/** Cosine similarity of two vectors (handles non-normalised inputs). */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Textbook DBSCAN using cosine similarity as the closeness measure
 * (two points are neighbours when `similarity >= similarityThreshold`).
 * Returns a label per point: `>= 0` cluster id, `-1` noise.
 */
function dbscan(vectors: number[][], { similarityThreshold, minPoints }: DbscanOptions): number[] {
  const n = vectors.length;
  const labels = new Array<number>(n).fill(-2); // -2 = unvisited, -1 = noise
  let clusterId = -1;

  // Precompute the neighbour lists (symmetric similarity matrix, upper triangle).
  const neighbours: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosineSimilarity(vectors[i], vectors[j]) >= similarityThreshold) {
        neighbours[i].push(j);
        neighbours[j].push(i);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue;

    const seeds = neighbours[i];
    if (seeds.length + 1 < minPoints) {
      labels[i] = -1; // noise (may be claimed later as a border point)
      continue;
    }

    clusterId += 1;
    labels[i] = clusterId;

    const queue = [...seeds];
    for (let q = 0; q < queue.length; q++) {
      const point = queue[q];
      if (labels[point] === -1) labels[point] = clusterId; // border point
      if (labels[point] !== -2) continue;
      labels[point] = clusterId;
      const pointNeighbours = neighbours[point];
      if (pointNeighbours.length + 1 >= minPoints) {
        for (const nb of pointNeighbours) if (labels[nb] === -2 || labels[nb] === -1) queue.push(nb);
      }
    }
  }

  return labels;
}

export const clusteringService = new ClusteringService();
