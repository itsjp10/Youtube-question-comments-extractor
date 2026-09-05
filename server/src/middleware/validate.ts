import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error';

interface Schemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validate + coerce `req.body` / `req.query` / `req.params` with Zod.
 * On success the parsed (typed, coerced) values replace the originals.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          ApiError.badRequest(
            'Validation failed',
            err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          ),
        );
        return;
      }
      next(err);
    }
  };
}
