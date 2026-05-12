import bcrypt from "bcrypt";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { sendMail } from "../../config/mail";
import { logger } from "../../config/logger";
import {
  AppError,
  UnauthorizedError,
  ConflictError,
} from "../../middleware/errorHandler";
import { JwtPayload } from "../../middleware/auth";
import type { UserRole } from "@prisma/client";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
}

export interface LoginDTO {
  /** Email ou CPF (apenas dígitos ou com pontuação). */
  identifier: string;
  password: string;
}

/**
 * Resolve um identificador (email ou CPF) para o `where` do Prisma.
 * Heurística simples: se contém "@", trata como email; caso contrário
 * sanitiza para 11 dígitos e busca por CPF.
 */
export function resolveLoginIdentifier(identifier: string): { email: string } | { cpf: string } | null {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11) {
    return { cpf: digits };
  }
  return null;
}

export class AuthService {
  private generateTokens(payload: JwtPayload) {
    // jwt.sign é um overload tricky no TS — o payload precisa ser
    // tratado como object plain. Cast em SignOptions evita o `as any`
    // sem perder type-safety na chamada.
    const accessOpts: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };
    const refreshOpts: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
    };
    const accessToken = jwt.sign(
      { ...payload },
      env.JWT_SECRET as Secret,
      accessOpts,
    );
    const refreshToken = jwt.sign(
      { ...payload },
      env.JWT_REFRESH_SECRET as Secret,
      refreshOpts,
    );
    return { accessToken, refreshToken };
  }

  async register(data: RegisterDTO) {
    // Mensagem genérica para evitar enumeração de email/CPF.
    // Antes retornávamos "este e-mail já está cadastrado" / "este CPF
    // já está cadastrado", o que permitia enumerar a base.
    const ENUMERATION_SAFE_MSG =
      "Não foi possível concluir o cadastro com os dados informados.";

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictError(ENUMERATION_SAFE_MSG);

    if (data.cpf) {
      const cpfExists = await prisma.user.findUnique({
        where: { cpf: data.cpf },
      });
      if (cpfExists) throw new ConflictError(ENUMERATION_SAFE_MSG);
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      Number(env.BCRYPT_ROUNDS),
    );

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        role: "RESIDENT" as UserRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return { user };
  }

  async login(data: LoginDTO, ipAddress?: string, userAgent?: string) {
    const where = resolveLoginIdentifier(data.identifier);
    if (!where) throw new UnauthorizedError("E-mail/CPF ou senha inválidos");

    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        passwordHash: true,
        isActive: true,
        avatarUrl: true,
        condominiumUsers: {
          where: { isActive: true },
          include: {
            condominium: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedError("E-mail/CPF ou senha inválidos");
    if (!user.isActive)
      throw new UnauthorizedError("Conta desativada. Contate o suporte.");

    const isValidPassword = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      const { auditService } = await import("../audit/audit.service");
      await auditService.write({
        userId: user.id,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Login falhou para ${user.email}: senha inválida`,
        ipAddress: ipAddress ?? null,
      });
      throw new UnauthorizedError("E-mail/CPF ou senha inválidos");
    }

    // 2FA: se habilitado, não emite tokens — emite challengeToken (5min).
    // O cliente precisa POST /auth/2fa-challenge {challengeToken, code}.
    const userExt = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });
    if (userExt?.twoFactorEnabled) {
      const challengeToken = jwt.sign(
        { userId: user.id, scope: "2fa-challenge" },
        env.JWT_SECRET as Secret,
        { expiresIn: "5m" },
      );
      return { requires2FA: true as const, challengeToken } as any;
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      name: user.name,
    };
    const { accessToken, refreshToken } = this.generateTokens(payload);

    // Salvar refresh token com metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        lastUsedAt: new Date(),
      },
    });

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { auditService } = await import("../audit/audit.service");
    await auditService.write({
      userId: user.id,
      action: "LOGIN",
      module: "auth",
      description: `Login bem-sucedido (${user.email})`,
      ipAddress: ipAddress ?? null,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    const mustEnable2FA = await this.shouldForce2FA(user.id, user.role);

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      mustEnable2FA,
    };
  }

  /**
   * Política: SYNDIC / CONDOMINIUM_ADMIN / SUPER_ADMIN em condomínios com
   * plano `professional` ou `enterprise` precisam ter 2FA habilitado.
   * Retorna true se o usuário ainda precisa configurar (ele já passou na
   * senha, então o login não é negado — o frontend usa essa flag para
   * forçar setup antes de liberar áreas sensíveis).
   */
  private async shouldForce2FA(
    userId: string,
    role: UserRole,
  ): Promise<boolean> {
    if (role !== "SYNDIC" && role !== "CONDOMINIUM_ADMIN" && role !== "SUPER_ADMIN") {
      return false;
    }
    const userExt = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (userExt?.twoFactorEnabled) return false;

    if (role === "SUPER_ADMIN") return true;

    // Para admins de condomínio: forçar se algum dos seus condomínios
    // estiver em plano >= professional.
    const REQUIRES_2FA_PLANS = ["professional", "enterprise"];
    const member = await prisma.condominiumUser.findFirst({
      where: {
        userId,
        isActive: true,
        condominium: { plan: { in: REQUIRES_2FA_PLANS } },
      },
      select: { id: true },
    });
    return !!member;
  }

  /**
   * Completa o login 2FA. Verifica challengeToken (JWT 5min com scope
   * `2fa-challenge`) + código TOTP/backup, então emite access+refresh
   * normais.
   */
  async verify2FAChallenge(challengeToken: string, code: string) {
    let decoded: { userId: string; scope: string };
    try {
      decoded = jwt.verify(challengeToken, env.JWT_SECRET) as any;
    } catch {
      throw new UnauthorizedError("Challenge inválido ou expirado");
    }
    if (decoded.scope !== "2fa-challenge") {
      throw new UnauthorizedError("Challenge inválido");
    }

    const { twoFactorService } = await import("../twofactor/twofactor.service");
    const result = await twoFactorService.verifyLogin(decoded.userId, code);
    if (!result.ok) throw new UnauthorizedError("Código 2FA inválido");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        condominiumUsers: {
          where: { isActive: true },
          include: {
            condominium: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });
    if (!user.isActive)
      throw new UnauthorizedError("Conta desativada. Contate o suporte.");

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      name: user.name,
    };
    const { accessToken, refreshToken } = this.generateTokens(payload);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user, accessToken, refreshToken, usedBackup: result.usedBackup };
  }

  async refreshTokens(token: string) {
    // Verificar JWT primeiro — se inválido/expirado, sai cedo sem
    // tocar no DB.
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError("Refresh token inválido ou expirado");
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    // Detecção de reuso: o JWT é válido (assinado pela nossa chave
    // e não expirou), mas o registro foi removido — significa que
    // alguém já rotacionou esse token. Se um atacante interceptou e
    // usou primeiro, o legítimo cai aqui. Em qualquer caso, é seguro
    // invalidar TODA a família de refresh tokens do usuário,
    // forçando re-login em todos os dispositivos.
    if (!stored) {
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.userId },
      });
      logger.warn(
        { userId: decoded.userId },
        "Refresh token reuso detectado — todas as sessões revogadas",
      );
      throw new UnauthorizedError("Refresh token inválido ou expirado");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token inválido ou expirado");
    }

    // Reler usuário do DB — role e isActive podem ter mudado desde
    // a emissão do JWT. Antes propagávamos decoded.role, o que
    // mantinha privilégios revogados.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, name: true, isActive: true },
    });
    if (!user || !user.isActive) {
      // Limpa também o refresh atual; não há motivo para mantê-lo.
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.userId },
      });
      throw new UnauthorizedError("Usuário inativo ou não encontrado");
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      name: user.name,
    };
    const tokens = this.generateTokens(payload);

    // Rotacionar refresh token (delete antigo, cria novo)
    await prisma.refreshToken.delete({ where: { token } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    // Confirma que o refreshToken pertence ao próprio dono (verificando
    // a assinatura do JWT) antes de deletar. Antes era deleteMany sem
    // filtro de userId — um atacante que conhecesse o refreshToken
    // de outro usuário podia deslogá-lo (DoS de sessão).
    let userId: string | undefined;
    try {
      const decoded = jwt.verify(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      ) as JwtPayload;
      userId = decoded.userId;
    } catch {
      // Token inválido/expirado — silenciosamente noop. Logout sempre
      // responde 200 para não vazar se o token era válido.
      return;
    }
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken, userId },
    });
  }

  async requestPasswordReset(email: string) {
    const start = Date.now();
    const user = await prisma.user.findUnique({ where: { email } });
    // Não revelar se o e-mail existe
    if (!user) {
      // Constant-time response to prevent timing-based email enumeration
      const elapsed = Date.now() - start;
      await new Promise((r) => setTimeout(r, Math.max(0, 200 - elapsed)));
      return;
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt },
    });

    // Enviar e-mail com link de reset
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0;">🔒 CondoSync</h1>
          <p style="color: #64748b; margin-top: 4px;">Recuperação de Senha</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px;">Olá, <strong>${user.name}</strong>!</p>
          <p style="color: #475569; line-height: 1.6;">
            Recebemos uma solicitação para redefinir sua senha. 
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="background: #3b82f6; color: #ffffff; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            Este link expira em <strong>2 horas</strong>. Se você não solicitou a redefinição, ignore este e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="color: #94a3b8; font-size: 12px;">
            Se o botão não funcionar, copie e cole este link no navegador:<br>
            <a href="${resetLink}" style="color: #3b82f6;">${resetLink}</a>
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
          Este é um e-mail automático do CondoSync. Por favor, não responda.
        </p>
      </div>
    `;

    try {
      await sendMail(
        user.email,
        "CondoSync — Redefinição de Senha",
        htmlContent,
      );
    } catch (error) {
      // Log mas não falha — evita revelar se o e-mail existe via tempo de resposta
      logger.error("Falha ao enviar e-mail de reset de senha", {
        userId: user.id,
        error,
      });
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await prisma.passwordReset.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
    });

    if (!reset) throw new AppError("Token inválido ou expirado", 400);

    const passwordHash = await bcrypt.hash(
      newPassword,
      Number(env.BCRYPT_ROUNDS),
    );

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
    ]);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError("Senha atual incorreta", 400);

    const passwordHash = await bcrypt.hash(
      newPassword,
      Number(env.BCRYPT_ROUNDS),
    );
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Invalidar todas as sessões activas [B2]
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
  }
}

export const authService = new AuthService();
