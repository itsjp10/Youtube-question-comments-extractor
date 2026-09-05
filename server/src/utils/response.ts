import type { Response } from 'express';

/** Consistent success envelope: `{ success: true, data, meta? }`. */
export function sendSuccess(
  res: Response,
  data: unknown,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  res.status(statusCode).json(meta ? { success: true, data, meta } : { success: true, data });
}
