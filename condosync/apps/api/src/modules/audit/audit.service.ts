import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "ACCESS";

interface LogParams {
  condominiumId?: string;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes?: { before?: any; after?: any };
  metadata?: { ip?: string; userAgent?: string; [key: string]: any };
}

interface ListParams {
  condominiumId?: string;
  userId?: string;
  entity?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

const SENSITIVE_FIELDS = ["password", "passwordHash", "token", "refreshToken", "secret", "twoFactorSecret"];

function maskSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitiveFields);

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      masked[key] = "***";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveFields(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

class AuditService {
  async log(params: LogParams): Promise<void> {
    try {
      const changes = params.changes
        ? {
            before: params.changes.before ? maskSensitiveFields(params.changes.before) : undefined,
            after: params.changes.after ? maskSensitiveFields(params.changes.after) : undefined,
          }
        : undefined;

      await prisma.auditLog.create({
        data: {
          condominiumId: params.condominiumId || null,
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          changes: changes || undefined,
          metadata: params.metadata || undefined,
        },
      });
    } catch (error) {
      logger.error("[AuditService] Falha ao gravar log de auditoria:", error);
    }
  }

  async list(params: ListParams) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.condominiumId) where.condominiumId = params.condominiumId;
    if (params.userId) where.userId = params.userId;
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = params.action;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getByEntity(entity: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const auditService = new AuditService();
