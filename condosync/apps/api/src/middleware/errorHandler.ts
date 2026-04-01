import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../config/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso', id?: string) {
    const msg = id
      ? `${resource} com ID "${id}" não encontrado`
      : `${resource} não encontrado`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  public details: Record<string, string[]>;
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details || {};
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Limite de requisições excedido') {
    super(message, 429, 'RATE_LIMIT');
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        ...(err instanceof ValidationError && Object.keys(err.details).length > 0 && { details: err.details }),
      },
    });
  }

  // Erros do Prisma
  if (err.name === 'PrismaClientKnownRequestError' || err.name === 'NotFoundError') {
    const prismaErr = err as { code?: string; meta?: { field_name?: string; target?: string[] } };
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT',
          message: `Já existe um registro com este ${prismaErr.meta?.target?.join(', ') || 'valor'}`,
        },
      });
    }
    if (prismaErr.code === 'P2025' || err.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Registro não encontrado' },
      });
    }
    if (prismaErr.code === 'P2003' || prismaErr.code === 'P2014' || prismaErr.code === 'P2023') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Referência não encontrada' },
      });
    }
  }

  // Erros JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' },
    });
  }

  // Capturar no Sentry apenas erros inesperados (não operacionais)
  Sentry.captureException(err, { extra: { url: req.url, method: req.method } });
  logger.error('Erro não tratado:', { error: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    },
  });
};
