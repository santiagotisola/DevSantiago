import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  condominiumId?: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso não fornecido');
  }

  const token = authHeader.slice(7);
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  // Verificar se o usuário ainda está ativo
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Usuário inativo ou não encontrado');
  }

  req.user = decoded;
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Você não tem permissão para esta ação');
    }

    next();
  };
};

export const authorizeCondominium = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) throw new UnauthorizedError();

  const condominiumId = req.params.condominiumId || req.body.condominiumId || req.query.condominiumId as string;

  if (!condominiumId) return next();

  // Super admin tem acesso total
  if (req.user.role === UserRole.SUPER_ADMIN) return next();

  // Verificar se o usuário pertence ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId: req.user.userId, condominiumId, isActive: true },
  });

  if (!membership) {
    throw new ForbiddenError('Acesso negado a este condomínio');
  }

  req.user.condominiumId = condominiumId;
  req.user.role = membership.role;

  next();
};
