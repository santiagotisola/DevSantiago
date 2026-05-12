import { prisma } from '../../config/prisma';
import { auditService } from '../audit/audit.service';
import {
  BadRequestError,
  NotFoundError,
} from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export const lgpdService = {
  /**
   * Devolve a versão atual em vigor de um tipo de termos.
   */
  async getCurrent(kind: 'terms_of_use' | 'privacy_policy') {
    const v = await prisma.termsVersion.findFirst({
      where: { kind, effectiveAt: { lte: new Date() } },
      orderBy: { effectiveAt: 'desc' },
    });
    if (!v) throw new NotFoundError('Termos', kind);
    return v;
  },

  /**
   * Lista todas as versões publicadas (para histórico legal).
   */
  async listVersions(kind?: string) {
    return prisma.termsVersion.findMany({
      where: kind ? { kind } : {},
      orderBy: { effectiveAt: 'desc' },
    });
  },

  /**
   * Publica nova versão (SUPER_ADMIN).
   */
  async publishVersion(input: {
    kind: 'terms_of_use' | 'privacy_policy';
    version: string;
    contentMd: string;
    effectiveAt?: Date;
    createdBy: string;
  }) {
    return prisma.termsVersion.create({
      data: {
        kind: input.kind,
        version: input.version,
        contentMd: input.contentMd,
        effectiveAt: input.effectiveAt ?? new Date(),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Status: o usuário aceitou as versões atuais?
   */
  async acceptanceStatus(userId: string) {
    const [terms, privacy] = await Promise.all([
      this.getCurrent('terms_of_use').catch(() => null),
      this.getCurrent('privacy_policy').catch(() => null),
    ]);
    const accepted = await prisma.termsAcceptance.findMany({
      where: { userId },
      select: { termsVersionId: true, acceptedAt: true },
    });
    const acceptedIds = new Set(accepted.map((a) => a.termsVersionId));
    return {
      terms: terms
        ? {
            id: terms.id,
            version: terms.version,
            accepted: acceptedIds.has(terms.id),
          }
        : null,
      privacy: privacy
        ? {
            id: privacy.id,
            version: privacy.version,
            accepted: acceptedIds.has(privacy.id),
          }
        : null,
      missing: [terms, privacy]
        .filter(Boolean)
        .filter((t) => !acceptedIds.has(t!.id))
        .map((t) => ({ id: t!.id, kind: t!.kind, version: t!.version })),
    };
  },

  /**
   * Registra aceite (idempotente).
   */
  async accept(
    userId: string,
    termsVersionId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tv = await prisma.termsVersion.findUnique({
      where: { id: termsVersionId },
    });
    if (!tv) throw new NotFoundError('TermsVersion', termsVersionId);

    const result = await prisma.termsAcceptance.upsert({
      where: {
        userId_termsVersionId: { userId, termsVersionId },
      },
      create: {
        userId,
        termsVersionId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      update: {}, // idempotente
    });
    await auditService.write({
      userId,
      action: 'ACCEPT_TERMS',
      module: 'lgpd',
      description: `${tv.kind} v${tv.version}`,
      metadata: { kind: tv.kind, version: tv.version },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
    return result;
  },

  /**
   * Export de dados pessoais (LGPD art. 18, I e II).
   * Retorna JSON com tudo que vinculamos a este usuário.
   */
  async exportData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundError('Usuário', userId);

    const [
      memberships,
      notifications,
      auditLogs,
      sessions,
      invitationsAccepted,
      pushSubs,
      passkeys,
      termsAcceptances,
    ] = await Promise.all([
      prisma.condominiumUser.findMany({
        where: { userId },
        include: { condominium: { select: { id: true, name: true } } },
      }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.refreshToken.findMany({
        where: { userId },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.invitation.findMany({ where: { acceptedById: userId } }),
      prisma.pushSubscription.findMany({
        where: { userId },
        select: { id: true, userAgent: true, createdAt: true },
      }),
      prisma.webAuthnCredential.findMany({
        where: { userId },
        select: {
          id: true,
          deviceName: true,
          transports: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
      prisma.termsAcceptance.findMany({
        where: { userId },
        include: { termsVersion: { select: { kind: true, version: true } } },
      }),
    ]);

    await auditService.write({
      userId,
      action: 'DATA_EXPORT',
      module: 'lgpd',
      description: 'Export de dados pessoais (LGPD art. 18)',
    });

    return {
      exportedAt: new Date().toISOString(),
      user,
      memberships,
      notifications,
      auditLogs,
      sessions,
      invitationsAccepted,
      pushSubscriptions: pushSubs,
      passkeys,
      termsAcceptances,
    };
  },

  /**
   * Anonimização ("direito ao esquecimento" LGPD art. 18, VI).
   * Mantém os registros que precisam de continuidade (memberships,
   * cobranças por obrigação fiscal de 5 anos) mas remove identificáveis
   * do usuário. Email/CPF/nome viram tokens determinísticos.
   *
   * NÃO deleta o User para não quebrar foreign keys de auditoria
   * histórica. Marca isActive=false e troca PII por placeholders.
   */
  async anonymize(userId: string, actorUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuário', userId);

    const stamp = Date.now();
    const anonId = `anon-${userId.slice(0, 8)}-${stamp}`;
    // Hash bcrypt válido de um segredo aleatório descartado: garante que
    // ninguém consegue logar (segredo não é armazenado) mas mantém o
    // formato esperado pelo bcrypt.compare em qualquer fluxo legado.
    const anonPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Usuário anonimizado',
          email: `${anonId}@anon.invalid`,
          cpf: null,
          phone: null,
          avatarUrl: null,
          passwordHash: anonPasswordHash,
          isActive: false,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null as any,
        },
      });
      // Revoga todas as sessões + tokens
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.passwordReset.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.webAuthnCredential.deleteMany({ where: { userId } });
      // Mantém memberships, audit logs e financeiro intactos por
      // obrigação contábil/fiscal.
    });

    await auditService.write({
      userId: actorUserId,
      action: 'ANONYMIZE_USER',
      module: 'lgpd',
      description: `Anonimização de ${user.email} (LGPD art. 18, VI)`,
      metadata: { targetUserId: userId, anonId },
    });
  },
};
