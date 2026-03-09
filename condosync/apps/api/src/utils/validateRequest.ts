import { z, ZodSchema } from 'zod';
import { ValidationError } from '../middleware/errorHandler';

export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new ValidationError('Dados inválidos', errors);
  }
  return result.data;
}
