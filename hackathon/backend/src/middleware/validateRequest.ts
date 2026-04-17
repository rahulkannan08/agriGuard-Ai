import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      throw new AppError(400, 'VALIDATION_ERROR', errorMessages);
    }

    req.body = result.data;
    next();
  };
}
