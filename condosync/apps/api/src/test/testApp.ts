import express, { Router } from 'express';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../middleware/errorHandler';
import { env } from '../config/env';
import type { UserRole } from '@prisma/client';

/**
 * Cria um app Express mínimo com error handler para uso em testes de rota
 * via supertest. NÃO inclui rate-limiter, helmet, metrics — só JSON + a
 * rota sob teste + errorHandler.
 */
export function makeTestApp(mountPath: string, router: Router) {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  // Promise rejection wrapper: rotas async lançam mas Express 4 não
  // captura — empurra para o errorHandler.
  app.use((err: any, _req: any, res: any, next: any) => errorHandler(err, _req, res, next));
  return app;
}

/**
 * Gera um JWT válido com o JWT_SECRET de teste e auth header pronto.
 * Combine com prismaMock.user.findUnique para simular o middleware
 * `authenticate` retornando o usuário ativo.
 */
export function makeAuthHeader(
  userId = 'test-user-1',
  role: UserRole = 'CONDOMINIUM_ADMIN' as UserRole,
) {
  const token = jwt.sign({ userId, role, name: 'Test' }, env.JWT_SECRET, {
    expiresIn: '1h',
  });
  return { token, header: `Bearer ${token}`, userId, role };
}
