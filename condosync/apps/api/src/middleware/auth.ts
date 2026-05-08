import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from "./errorHandler";
import { UserRole } from "@prisma/client";
import { idorGuardDecisions } from "../config/metrics";

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

// ─── requireResourceMembership ────────────────────────────────
//
// Middleware reutilizável que carrega um recurso pelo `:id` da URL,
// extrai o `condominiumId` dele, e valida que o ator pertence
// ativamente a esse condomínio (ou é SUPER_ADMIN).
//
// Mata a classe inteira de IDORs em rotas que faziam
// `findUniqueOrThrow({ where: { id }})` sem comparar tenant — atacante
// SYNDIC do condo A passava UUID de recurso do condo B e o handler
// não percebia.
//
// Suporte a recursos onde `condominiumId` está em campo aninhado
// (ex: Charge.unit.condominiumId) via `condominiumIdResolver`.
//
// Uso:
//   router.patch('/:id',
//     authorize(...STAFF_ROLES),
//     requireResourceMembership('ticket'),
//     handler,
//   );
//
//   router.delete('/:id',
//     requireResourceMembership('charge', {
//       include: { unit: { select: { condominiumId: true }}},
//       resolveCondominiumId: r => r.unit.condominiumId,
//     }),
//     handler,
//   );

type PrismaModelKey = Exclude<
  keyof typeof prisma,
  | "$connect"
  | "$disconnect"
  | "$on"
  | "$transaction"
  | "$use"
  | "$extends"
  | "$queryRaw"
  | "$queryRawUnsafe"
  | "$executeRaw"
  | "$executeRawUnsafe"
  | symbol
>;

interface ResourceMembershipOptions {
  paramName?: string;
  /** include adicional para resolver condominiumId aninhado */
  include?: Record<string, unknown>;
  /** resolver custom; default é record.condominiumId */
  resolveCondominiumId?: (record: Record<string, unknown>) => string | null | undefined;
  /** label para mensagem de erro */
  resourceLabel?: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Recurso carregado por requireResourceMembership */
      resource?: Record<string, unknown>;
    }
  }
}

export function requireResourceMembership(
  model: PrismaModelKey,
  options: ResourceMembershipOptions = {},
) {
  const paramName = options.paramName ?? "id";
  const resolveCondominiumId =
    options.resolveCondominiumId ??
    ((r: Record<string, unknown>) => r.condominiumId as string | undefined);
  const label = options.resourceLabel ?? String(model);

  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();

    const id = req.params[paramName];
    if (!id) {
      throw new BadRequestError(`${paramName} é obrigatório nesta rota`);
    }

    const delegate = (prisma as unknown as Record<string, {
      findUnique(args: unknown): Promise<Record<string, unknown> | null>;
    }>)[model as string];
    if (!delegate || typeof delegate.findUnique !== "function") {
      throw new Error(
        `requireResourceMembership: model '${String(model)}' inválido`,
      );
    }

    const record = await delegate.findUnique({
      where: { id },
      ...(options.include ? { include: options.include } : {}),
    });
    if (!record) throw new NotFoundError(label, id);

    // SUPER_ADMIN bypass — segue passando recurso para o handler.
    if (req.user.role === UserRole.SUPER_ADMIN) {
      req.resource = record;
      idorGuardDecisions.labels(label, "allow_superadmin").inc();
      return next();
    }

    const targetCondoId = resolveCondominiumId(record);
    if (!targetCondoId) {
      // Recurso sem condominiumId resolvível — não há como provar
      // pertença. Falha fechada por segurança.
      idorGuardDecisions.labels(label, "deny_no_tenant").inc();
      throw new ForbiddenError(
        `Não foi possível resolver condominiumId para ${label}`,
      );
    }

    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: req.user.userId,
        condominiumId: targetCondoId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership) {
      // 404 em vez de 403 para não vazar a existência do recurso
      // de outro condomínio. Atacante recebe a mesma resposta de
      // "id não existe".
      idorGuardDecisions.labels(label, "deny_cross_tenant").inc();
      throw new NotFoundError(label, id);
    }

    req.resource = record;
    idorGuardDecisions.labels(label, "allow").inc();
    next();
  };
}
