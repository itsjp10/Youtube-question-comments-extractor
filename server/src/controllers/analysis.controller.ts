import { z } from 'zod';
import type { Request, Response } from 'express';
import { analysisService } from '../services/analysis.service';
import { sendSuccess } from '../utils/response';
import { isYouTubeUrl } from '../utils/youtube-url';

export const createAnalysisSchema = {
  body: z.object({
    videoUrl: z
      .string({ required_error: 'videoUrl is required' })
      .trim()
      .min(1, 'videoUrl is required')
      .refine(isYouTubeUrl, 'Provide a valid YouTube video URL (youtube.com/watch?v=... or youtu.be/...)'),
    force: z.boolean().optional().default(false),
  }),
};

export const listAnalysesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export const analysisIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

/** POST /api/analyses */
export async function createAnalysis(req: Request, res: Response): Promise<void> {
  const { videoUrl, force } = req.body as { videoUrl: string; force: boolean };
  const result = await analysisService.createAnalysis(videoUrl, force);
  sendSuccess(res, result, result.duplicate ? 200 : 201);
}

/** GET /api/analyses */
export async function listAnalyses(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const { items, total, totalPages } = await analysisService.listAnalyses(page, limit);
  sendSuccess(res, items, 200, { page, limit, total, totalPages });
}

/** GET /api/analyses/:id */
export async function getAnalysis(req: Request, res: Response): Promise<void> {
  const analysis = await analysisService.getAnalysisById(req.params.id);
  sendSuccess(res, analysis);
}

/** DELETE /api/analyses/:id */
export async function deleteAnalysis(req: Request, res: Response): Promise<void> {
  await analysisService.deleteAnalysis(req.params.id);
  sendSuccess(res, { id: req.params.id, deleted: true });
}
