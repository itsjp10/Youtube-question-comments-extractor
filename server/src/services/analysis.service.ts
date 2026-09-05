import { randomUUID } from 'node:crypto';
import type { Analysis, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { extractVideoId, canonicalVideoUrl } from '../utils/youtube-url';
import { youtubeService } from './youtube.service';
import { commentProcessingService } from './comment-processing.service';
import { clusteringService } from './clustering.service';
import type { ClusterResult } from '../types';

export interface CreateAnalysisResult {
  duplicate: boolean;
  previousAnalysis: { id: string; createdAt: Date; videoTitle: string | null } | null;
  analysis: AnalysisDetailDTO | null;
}

export interface AnalysisListItemDTO {
  id: string;
  youtubeVideoId: string;
  videoUrl: string;
  videoTitle: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  status: Analysis['status'];
  totalComments: number;
  relevantComments: number;
  faqCount: number;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AnalysisDetailDTO extends Omit<AnalysisListItemDTO, 'faqCount'> {
  viewCount: string | null;
  commentCount: number | null;
  publishedAt: Date | null;
  stats: {
    totalComments: number;
    relevantComments: number;
    faqCount: number;
  };
  faqs: Array<{
    id: string;
    rank: number;
    representativeQuestion: string;
    frequency: number;
    score: number;
    comments: Array<{
      id: string;
      text: string;
      author: string | null;
      likeCount: number;
      publishedAt: Date | null;
      classification: string | null;
    }>;
  }>;
}

/**
 * Orchestrates the full analysis pipeline and owns all persistence for
 * Analysis / Comment / FAQCluster.
 *
 * `runAnalysis` runs synchronously today. It is deliberately a single method
 * with no HTTP awareness so it can later be moved behind a queue (Redis/BullMQ)
 * without touching controllers.
 */
class AnalysisService {
  async createAnalysis(videoUrl: string, force: boolean): Promise<CreateAnalysisResult> {
    const videoId = extractVideoId(videoUrl);

    const previous = await this.findRecentAnalysis(videoId);
    if (previous && !force) {
      return {
        duplicate: true,
        previousAnalysis: {
          id: previous.id,
          createdAt: previous.createdAt,
          videoTitle: previous.videoTitle,
        },
        analysis: null,
      };
    }

    const created = await prisma.analysis.create({
      data: {
        youtubeVideoId: videoId,
        videoUrl: canonicalVideoUrl(videoId),
        status: 'PENDING',
      },
    });

    const detail = await this.runAnalysis(created.id);

    return {
      duplicate: false,
      previousAnalysis: previous
        ? { id: previous.id, createdAt: previous.createdAt, videoTitle: previous.videoTitle }
        : null,
      analysis: detail,
    };
  }

  /**
   * Execute the pipeline for an existing Analysis row. Always resolves by
   * leaving the row in a terminal state (COMPLETED / FAILED); re-throws so the
   * caller can surface the error to the client.
   */
  async runAnalysis(analysisId: string): Promise<AnalysisDetailDTO> {
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw ApiError.notFound('Analysis not found');

    try {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'PROCESSING', errorMessage: null },
      });

      // 3. Video metadata
      const meta = await youtubeService.getVideoMetadata(analysis.youtubeVideoId);
      if (meta.commentsDisabled) {
        throw ApiError.unprocessable('YouTube comments are disabled for this video.');
      }

      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          videoTitle: meta.title,
          channelTitle: meta.channelTitle,
          thumbnailUrl: meta.thumbnailUrl,
          viewCount: meta.viewCount,
          commentCount: meta.commentCount,
          publishedAt: meta.publishedAt ? new Date(meta.publishedAt) : null,
        },
      });

      // 4. Fetch comments
      const raw = await youtubeService.getComments(
        analysis.youtubeVideoId,
        env.MAX_COMMENTS_PER_ANALYSIS,
      );

      // 5-6. Clean + classify
      const clean = commentProcessingService.cleanComments(raw);
      const classified = await commentProcessingService.classifyComments(clean);

      // 7. Keep FAQ-worthy comments
      const relevant = commentProcessingService.filterRelevant(classified);

      // 8-10. Embeddings -> clustering -> representative question -> ranking
      const clusters = await clusteringService.clusterComments(relevant);

      // 11. Persist everything atomically
      await this.persistResults(analysisId, classified, clusters);

      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          totalComments: clean.length,
          relevantComments: relevant.length,
          completedAt: new Date(),
        },
      });

      return this.getAnalysisById(analysisId);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Unknown error';
      await prisma.analysis
        .update({
          where: { id: analysisId },
          data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
        })
        .catch(() => undefined);
      throw err instanceof ApiError ? err : ApiError.internal(message);
    }
  }

  async listAnalyses(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      prisma.analysis.count(),
      prisma.analysis.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { clusters: true } } },
      }),
    ]);

    const items: AnalysisListItemDTO[] = rows.map((r) => ({
      id: r.id,
      youtubeVideoId: r.youtubeVideoId,
      videoUrl: r.videoUrl,
      videoTitle: r.videoTitle,
      channelTitle: r.channelTitle,
      thumbnailUrl: r.thumbnailUrl,
      status: r.status,
      totalComments: r.totalComments,
      relevantComments: r.relevantComments,
      faqCount: r._count.clusters,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAnalysisById(id: string): Promise<AnalysisDetailDTO> {
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        clusters: {
          orderBy: [{ score: 'desc' }, { frequency: 'desc' }],
          include: {
            comments: {
              orderBy: [{ likeCount: 'desc' }, { publishedAt: 'asc' }],
            },
          },
        },
      },
    });

    if (!analysis) throw ApiError.notFound('Analysis not found');

    return {
      id: analysis.id,
      youtubeVideoId: analysis.youtubeVideoId,
      videoUrl: analysis.videoUrl,
      videoTitle: analysis.videoTitle,
      channelTitle: analysis.channelTitle,
      thumbnailUrl: analysis.thumbnailUrl,
      viewCount: analysis.viewCount,
      commentCount: analysis.commentCount,
      publishedAt: analysis.publishedAt,
      status: analysis.status,
      totalComments: analysis.totalComments,
      relevantComments: analysis.relevantComments,
      errorMessage: analysis.errorMessage,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      stats: {
        totalComments: analysis.totalComments,
        relevantComments: analysis.relevantComments,
        faqCount: analysis.clusters.length,
      },
      faqs: analysis.clusters.map((cluster, i) => ({
        id: cluster.id,
        rank: i + 1,
        representativeQuestion: cluster.representativeQuestion,
        frequency: cluster.frequency,
        score: cluster.score,
        comments: cluster.comments.map((c) => ({
          id: c.id,
          text: c.text,
          author: c.author,
          likeCount: c.likeCount,
          publishedAt: c.publishedAt,
          classification: c.classification,
        })),
      })),
    };
  }

  async deleteAnalysis(id: string): Promise<void> {
    const existing = await prisma.analysis.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Analysis not found');
    // Comment / FAQCluster rows are removed via onDelete: Cascade.
    await prisma.analysis.delete({ where: { id } });
  }

  async getDashboardStats() {
    const [totalAnalyses, distinctVideos, sums, faqsDetected, statusGroups] = await Promise.all([
      prisma.analysis.count(),
      prisma.analysis.findMany({ distinct: ['youtubeVideoId'], select: { youtubeVideoId: true } }),
      prisma.analysis.aggregate({
        _sum: { totalComments: true, relevantComments: true },
      }),
      prisma.fAQCluster.count(),
      prisma.analysis.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      totalAnalyses,
      videosAnalyzed: distinctVideos.length,
      commentsProcessed: sums._sum.totalComments ?? 0,
      relevantCommentsProcessed: sums._sum.relevantComments ?? 0,
      faqsDetected,
      byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
    };
  }

  // ---------------------------------------------------------------------------

  private async findRecentAnalysis(videoId: string) {
    if (env.DUPLICATE_ANALYSIS_WINDOW_HOURS <= 0) return null;
    const cutoff = new Date(Date.now() - env.DUPLICATE_ANALYSIS_WINDOW_HOURS * 3600_000);
    return prisma.analysis.findFirst({
      where: {
        youtubeVideoId: videoId,
        status: 'COMPLETED',
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async persistResults(
    analysisId: string,
    classified: Awaited<ReturnType<typeof commentProcessingService.classifyComments>>,
    clusters: ClusterResult[],
  ): Promise<void> {
    // Assign generated ids to clusters so comments can reference them.
    const clusterRows = clusters.map((cluster) => ({
      id: randomUUID(),
      analysisId,
      representativeQuestion: cluster.representativeQuestion,
      frequency: cluster.frequency,
      score: cluster.score,
    }));

    const commentToCluster = new Map<string, string>();
    clusters.forEach((cluster, idx) => {
      for (const c of cluster.comments) commentToCluster.set(c.commentId, clusterRows[idx].id);
    });

    const commentRows: Prisma.CommentCreateManyInput[] = classified.map((c) => ({
      analysisId,
      youtubeCommentId: c.commentId,
      text: c.text,
      author: c.author,
      likeCount: c.likeCount,
      publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
      classification: c.intent,
      clusterId: commentToCluster.get(c.commentId) ?? null,
    }));

    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { analysisId } }),
      prisma.fAQCluster.deleteMany({ where: { analysisId } }),
      ...(clusterRows.length ? [prisma.fAQCluster.createMany({ data: clusterRows })] : []),
      ...(commentRows.length ? [prisma.comment.createMany({ data: commentRows })] : []),
    ]);
  }
}

export const analysisService = new AnalysisService();
