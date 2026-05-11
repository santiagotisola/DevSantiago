import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { sendMail } from '../../config/mail';
import { logger } from '../../config/logger';
import { buildInvitationEmail } from './invitation.email';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../middleware/errorHandler';
import { invitationsTotal } from '../../config/metrics';

const log = logger.child({ module: 'invitations' });

// Token plain tem 32 bytes urlsafe. Armazenamos apenas o sha256 — vazamento
// do DB não dá acesso. O plain só viaja no email enviado ao convidado.
const TOKEN_BYTES = 32;
const DEFAULT_TTL_HOURS = 72;
const MAX_RESEND_PER_HOUR = 3;

export interface CreateInvitationInput {
  email: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  role: UserRole;
  condominiumId: string;
  unitId?: string | null;
  invitedById: string;
  ttlHours?: number;
}

export interface AcceptInvitationInput {
  token: string;
  password: string;
  name?: string;
  cpf?: string;
  phone?: string;
}

export interface InvitationPublicView {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  condominium: { id: string; name: string };
  unit: { id: string; identifier: string; block: string | null } | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  alreadyHasAccount: boolean;
  inviterName: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function isExpired(invitation: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null }): boolean {
  if (invitation.acceptedAt) return true;
  if (invitation.revokedAt) return true;
  return invitation.expiresAt.getTime() <= Date.now();
}

async function dispatchEmail(opts: {
  to: string;
  inviteeName: string | null;
  condominiumName: string;
  inviterName: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
}) {
  const { subject, html } = buildInvitationEmail({
    inviteeName: opts.inviteeName,
    condominiumName: opts.condominiumName,
    inviterName: opts.inviterName,
    role: opts.role,
    token: opts.token,
    expiresAt: opts.expiresAt,
  });
  await sendMail(opts.to, subject, html);
}

export const invitationService = {
  /**
   * Cria um convite, salva o token hashado e dispara email.
   * Idempotente para mesmo (email, condominiumId, role, unitId) com convite pendente:
   * reaproveita o convite existente e gera novo token (rate-limited).
   */
  async create(input: CreateInvitationInput): Promise<{ invitation: { id: string; expiresAt: Date }; sentTo: string }> {
    const condominium = await prisma.condominium.findUnique({
      where: { id: input.condominiumId },
      select: { id: true, name: true, isActive: true },
    });
    if (!condominium || !condominium.isActive) {
      throw new BadRequestError('Condomínio inválido ou inativo');
    }

    const inviter = await prisma.user.findUnique({
      where: { id: input.invitedById },
      select: { id: true, name: true },
    });
    if (!inviter) throw new BadRequestError('Usuário convidante inválido');

    if (input.role === UserRole.RESIDENT && !input.unitId) {
      throw new BadRequestError('Convites para morador exigem unitId');
    }

    if (input.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: input.unitId, condominiumId: input.condominiumId },
        select: { id: true },
      });
      if (!unit) throw new BadRequestError('Unidade não pertence ao condomínio');
    }

    const ttlHours = input.ttlHours ?? DEFAULT_TTL_HOURS;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Verifica se já existe convite pendente válido — se sim, regenera token
    const existing = await prisma.invitation.findFirst({
      where: {
        email: input.email.toLowerCase(),
        condominiumId: input.condominiumId,
        role: input.role,
        unitId: input.unitId ?? null,
        acceptedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const token = generateToken();
    const tokenHash = hashToken(token);

    let invitation;
    if (existing) {
      // Rate-limit reenvio
      const lastSentMinutes = (Date.now() - existing.lastSentAt.getTime()) / 60000;
      if (lastSentMinutes < 60 / MAX_RESEND_PER_HOUR) {
        throw new ConflictError(
          `Aguarde ${Math.ceil(60 / MAX_RESEND_PER_HOUR - lastSentMinutes)} min antes de reenviar`,
        );
      }
      invitation = await prisma.invitation.update({
        where: { id: existing.id },
        data: {
          tokenHash,
          expiresAt,
          lastSentAt: new Date(),
          sendCount: existing.sendCount + 1,
          name: input.name ?? existing.name,
          cpf: input.cpf ?? existing.cpf,
          phone: input.phone ?? existing.phone,
        },
      });
      invitationsTotal.labels('resent').inc();
    } else {
      invitation = await prisma.invitation.create({
        data: {
          tokenHash,
          email: input.email.toLowerCase(),
          name: input.name ?? null,
          cpf: input.cpf ?? null,
          phone: input.phone ?? null,
          role: input.role,
          condominiumId: input.condominiumId,
          unitId: input.unitId ?? null,
          invitedById: input.invitedById,
          expiresAt,
        },
      });
      invitationsTotal.labels('created').inc();
    }

    try {
      await dispatchEmail({
        to: input.email,
        inviteeName: input.name ?? null,
        condominiumName: condominium.name,
        inviterName: inviter.name,
        role: input.role,
        token,
        expiresAt,
      });
    } catch (err) {
      log.error('Falha ao despachar email de convite', { invitationId: invitation.id, error: err });
      invitationsTotal.labels('email_failed').inc();
      // Não relança — o convite existe; admin pode reenviar pela UI
    }

    return {
      invitation: { id: invitation.id, expiresAt: invitation.expiresAt },
      sentTo: input.email,
    };
  },

  /**
   * Visualização pública do convite (sem expor tokenHash nem invitedById).
   * Aceita o token plain e devolve dados para a tela de aceite.
   */
  async previewByToken(token: string): Promise<InvitationPublicView> {
    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        condominium: { select: { id: true, name: true } },
        unit: { select: { id: true, identifier: true, block: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!invitation) throw new NotFoundError('Convite', 'token');
    if (isExpired(invitation)) {
      throw new BadRequestError(
        invitation.acceptedAt
          ? 'Este convite já foi utilizado'
          : invitation.revokedAt
            ? 'Este convite foi revogado'
            : 'Convite expirado',
      );
    }

    const userExisting = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      condominium: invitation.condominium,
      unit: invitation.unit,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      alreadyHasAccount: !!userExisting,
      inviterName: invitation.invitedBy.name,
    };
  },

  /**
   * Aceita o convite. Em transação:
   *  1. Re-valida token + expiração + non-revoked.
   *  2. Cria User (se não existe) ou atualiza senha (se já existe).
   *  3. Cria/reativa CondominiumUser.
   *  4. Marca invitation como aceito.
   */
  async accept(input: AcceptInvitationInput): Promise<{ userId: string; condominiumId: string }> {
    const tokenHash = hashToken(input.token);
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(input.password, rounds);

    return prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        include: { condominium: { select: { isActive: true } } },
      });
      if (!invitation) throw new NotFoundError('Convite', 'token');
      if (invitation.acceptedAt) throw new BadRequestError('Este convite já foi utilizado');
      if (invitation.revokedAt) throw new BadRequestError('Este convite foi revogado');
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestError('Convite expirado');
      }
      if (!invitation.condominium.isActive) {
        throw new BadRequestError('Condomínio inativo');
      }

      // Resolve user
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      const cpf = input.cpf ?? invitation.cpf ?? undefined;
      const phone = input.phone ?? invitation.phone ?? undefined;
      const name = input.name ?? invitation.name ?? invitation.email.split('@')[0];

      if (!user) {
        user = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            name,
            role: invitation.role,
            emailVerified: true,
            ...(cpf ? { cpf } : {}),
            ...(phone ? { phone } : {}),
          },
        });
      } else {
        // Não rebaixa role de usuário existente: se já é SUPER_ADMIN, mantém.
        // Atualiza senha (escopo do convite é justamente definir credenciais).
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            isActive: true,
            emailVerified: true,
            ...(name ? { name } : {}),
            ...(cpf ? { cpf } : {}),
            ...(phone ? { phone } : {}),
          },
        });
      }

      // Vínculo no condomínio (upsert via composite unique)
      await tx.condominiumUser.upsert({
        where: {
          userId_condominiumId: {
            userId: user.id,
            condominiumId: invitation.condominiumId,
          },
        },
        create: {
          userId: user.id,
          condominiumId: invitation.condominiumId,
          role: invitation.role,
          ...(invitation.unitId ? { unitId: invitation.unitId } : {}),
        },
        update: {
          isActive: true,
          role: invitation.role,
          ...(invitation.unitId ? { unitId: invitation.unitId } : {}),
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), acceptedById: user.id },
      });

      invitationsTotal.labels('accepted').inc();

      return { userId: user.id, condominiumId: invitation.condominiumId };
    });
  },

  /**
   * Lista convites de um condomínio com status calculado.
   */
  async listByCondominium(condominiumId: string) {
    const rows = await prisma.invitation.findMany({
      where: { condominiumId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { name: true } },
        unit: { select: { identifier: true, block: true } },
      },
      take: 200,
    });

    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      unit: r.unit,
      invitedBy: r.invitedBy.name,
      expiresAt: r.expiresAt,
      acceptedAt: r.acceptedAt,
      revokedAt: r.revokedAt,
      lastSentAt: r.lastSentAt,
      sendCount: r.sendCount,
      createdAt: r.createdAt,
      status: r.acceptedAt
        ? 'accepted'
        : r.revokedAt
          ? 'revoked'
          : r.expiresAt.getTime() <= now
            ? 'expired'
            : 'pending',
    }));
  },

  async revoke(id: string, condominiumId: string) {
    const inv = await prisma.invitation.findFirst({
      where: { id, condominiumId },
    });
    if (!inv) throw new NotFoundError('Convite', id);
    if (inv.acceptedAt) {
      throw new BadRequestError('Convite já aceito não pode ser revogado');
    }
    if (inv.revokedAt) return inv;
    invitationsTotal.labels('revoked').inc();
    return prisma.invitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async resend(id: string, condominiumId: string) {
    const inv = await prisma.invitation.findFirst({
      where: { id, condominiumId },
      include: {
        condominium: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!inv) throw new NotFoundError('Convite', id);
    if (inv.acceptedAt) throw new BadRequestError('Convite já aceito');
    if (inv.revokedAt) throw new BadRequestError('Convite revogado');

    const lastSentMinutes = (Date.now() - inv.lastSentAt.getTime()) / 60000;
    if (lastSentMinutes < 60 / MAX_RESEND_PER_HOUR) {
      throw new ConflictError(
        `Aguarde ${Math.ceil(60 / MAX_RESEND_PER_HOUR - lastSentMinutes)} min antes de reenviar`,
      );
    }

    const newToken = generateToken();
    const newExpiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);

    await prisma.invitation.update({
      where: { id },
      data: {
        tokenHash: hashToken(newToken),
        expiresAt: newExpiresAt,
        lastSentAt: new Date(),
        sendCount: inv.sendCount + 1,
      },
    });

    try {
      await dispatchEmail({
        to: inv.email,
        inviteeName: inv.name,
        condominiumName: inv.condominium.name,
        inviterName: inv.invitedBy.name,
        role: inv.role,
        token: newToken,
        expiresAt: newExpiresAt,
      });
      invitationsTotal.labels('resent').inc();
    } catch (err) {
      log.error('Falha ao despachar email de reenvio', { invitationId: id, error: err });
      invitationsTotal.labels('email_failed').inc();
      throw new BadRequestError('Falha ao enviar email; convite atualizado mas tente novamente em instantes');
    }

    return { id, expiresAt: newExpiresAt };
  },
};

export type InvitationService = typeof invitationService;
// re-export para testes
export const __internal = { hashToken, generateToken };
