import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { Prisma } from '@prisma/client';

const log = logger.child({ module: 'audit' });

export interface AuditWriteInput {
  userId?: string | null;
  condominiumId?: string | null;
  action: string;       // ex: LOGIN, CREATE, UPDATE, DELETE, ENABLE_2FA, etc.
  module: string;       // ex: auth, finance, condominiums
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditListFilters {
  condominiumId?: string;
  userId?: string;
  module?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  q?: string; // busca em description
  page?: number;
  pageSize?: number;
}

export const auditService = {
  /**
   * Grava um audit log. Nunca lança — falha em audit não pode quebrar
   * a operação que estava sendo auditada.
   */
  async write(input: AuditWriteInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          condominiumId: input.condominiumId ?? null,
          action: input.action,
          module: input.module,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          description: input.description,
          metadata: (input.metadata ?? Prisma.JsonNull) as any,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      log.warn(
        `Falha ao gravar audit log [${input.module}/${input.action}]: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },

  async list(filters: AuditListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.condominiumId) where.condominiumId = filters.condominiumId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    if (filters.q) {
      where.description = { contains: filters.q, mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items: rows };
  },

  /** Distinct values para popular filtros da UI */
  async facets(condominiumId?: string) {
    const where = condominiumId ? { condominiumId } : {};
    const [modules, actions] = await Promise.all([
      prisma.auditLog.groupBy({ by: ['module'], where, _count: { module: true }, orderBy: { _count: { module: 'desc' } } }),
      prisma.auditLog.groupBy({ by: ['action'], where, _count: { action: true }, orderBy: { _count: { action: 'desc' } } }),
    ]);
    return {
      modules: modules.map((m) => ({ value: m.module, count: m._count.module })),
      actions: actions.map((a) => ({ value: a.action, count: a._count.action })),
    };
  },
};
