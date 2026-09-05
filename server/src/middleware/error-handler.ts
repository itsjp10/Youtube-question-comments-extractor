import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

/** Terminal Express error handler — always emits the standard error envelope. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Resource not found';
    } else {
      statusCode = 400;
      message = `Database error (${err.code})`;
    }
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details !== undefined ? { details } : {}),
      ...(env.NODE_ENV === 'development' && err instanceof Error && statusCode >= 500
        ? { stack: err.stack }
        : {}),
    },
  });
}
