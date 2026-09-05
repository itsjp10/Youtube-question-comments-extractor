import type { Request, Response } from 'express';
import { analysisService } from '../services/analysis.service';
import { sendSuccess } from '../utils/response';

/** GET /api/dashboard/stats */
export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const stats = await analysisService.getDashboardStats();
  sendSuccess(res, stats);
}
