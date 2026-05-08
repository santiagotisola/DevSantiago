import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "./errorHandler";
import { UserRole } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  condominiumId?: string;
  name?: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Conjuntos de roles compartilhados ────────────────────────
// Antes copiados em ~30 arquivos de rotas. Centralizar aqui evita
// que um módulo esqueça uma role nova ou inclua uma indevida.
export const STAFF_ROLES = [
  UserRole.DOORMAN,
  UserRole.CONDOMINIUM_ADMIN,
  UserRole.SYNDIC,
  UserRole.SUPER_ADMIN,
] as const;

export const MANAGEMENT_ROLES = [
  UserRole.CONDOMINIUM_ADMIN,
  UserRole.SYNDIC,
  UserRole.SUPER_ADMIN,
] as const;

export const COUNCIL_ROLES = [
  UserRole.CONDOMINIUM_ADMIN,
  UserRole.SYNDIC,
  UserRole.COUNCIL_MEMBER,
  UserRole.SUPER_ADMIN,
] as const;

export const ALL_AUTHENTICATED_ROLES = [
  UserRole.DOORMAN,
  UserRole.CONDOMINIUM_ADMIN,
  UserRole.SYNDIC,
  UserRole.SUPER_ADMIN,
  UserRole.RESIDENT,
  UserRole.SERVICE_PROVIDER,
  UserRole.COUNCIL_MEMBER,
] as const;

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token de acesso não fornecido");
  }

  const token = authHeader.slice(7);
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  // Verificar se o usuário ainda está ativo e ler role atual do DB.
  // Usar a role do JWT permite escalada de privilégio: um SUPER_ADMIN
  // rebaixado a RESIDENT mantém poderes até o token expirar.
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Usuário inativo ou não encontrado");
  }

  req.user = { ...decoded, role: user.role };
  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("Você não tem permissão para esta ação");
    }

    next();
  };
};

export const authorizeCondominium = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user) throw new UnauthorizedError();

  const condominiumId =
    req.params.condominiumId ||
    req.body?.condominiumId ||
    (req.query.condominiumId as string | undefined);

  // Fail-closed: sem condominiumId não há como verificar membership.
  // Antes esse caminho retornava next() silenciosamente, abrindo IDOR
  // em qualquer rota futura que esquecesse o parâmetro.
  if (!condominiumId) {
    throw new BadRequestError(
      "condominiumId é obrigatório (params, body ou query) para esta rota.",
    );
  }

  // Super admin tem acesso total
  if (req.user.role === UserRole.SUPER_ADMIN) return next();

  // Verificar se o usuário pertence ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId: req.user.userId, condominiumId, isActive: true },
  });

  if (!membership) {
    throw new ForbiddenError("Acesso negado a este condomínio");
  }

  req.user.condominiumId = condominiumId;
  req.user.role = membership.role;

  next();
};
