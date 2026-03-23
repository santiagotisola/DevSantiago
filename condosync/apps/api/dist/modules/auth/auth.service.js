"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const prisma_1 = require("../../config/prisma");
const env_1 = require("../../config/env");
const mail_1 = require("../../config/mail");
const logger_1 = require("../../config/logger");
const errorHandler_1 = require("../../middleware/errorHandler");
class AuthService {
    generateTokens(payload) {
        const accessToken = jsonwebtoken_1.default.sign({ ...payload }, env_1.env.JWT_SECRET, {
            expiresIn: env_1.env.JWT_EXPIRES_IN,
        });
        const refreshToken = jsonwebtoken_1.default.sign({ ...payload }, env_1.env.JWT_REFRESH_SECRET, {
            expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
        });
        return { accessToken, refreshToken };
    }
    async register(data) {
        const existing = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existing)
            throw new errorHandler_1.ConflictError("Este e-mail já está cadastrado");
        if (data.cpf) {
            const cpfExists = await prisma_1.prisma.user.findUnique({
                where: { cpf: data.cpf },
            });
            if (cpfExists)
                throw new errorHandler_1.ConflictError("Este CPF já está cadastrado");
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, Number(env_1.env.BCRYPT_ROUNDS));
        const user = await prisma_1.prisma.user.create({
            data: {
                ...data,
                passwordHash,
                role: "RESIDENT",
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
    async login(data, ipAddress) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
            select: {
                id: true,
                name: true,
                email: true,
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
        if (!user)
            throw new errorHandler_1.UnauthorizedError("E-mail ou senha inválidos");
        if (!user.isActive)
            throw new errorHandler_1.UnauthorizedError("Conta desativada. Contate o suporte.");
        const isValidPassword = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isValidPassword)
            throw new errorHandler_1.UnauthorizedError("E-mail ou senha inválidos");
        const payload = {
            userId: user.id,
            role: user.role,
            name: user.name,
        };
        const { accessToken, refreshToken } = this.generateTokens(payload);
        // Salvar refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma_1.prisma.refreshToken.create({
            data: { token: refreshToken, userId: user.id, expiresAt },
        });
        // Atualizar último login
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const { passwordHash: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(token) {
        const stored = await prisma_1.prisma.refreshToken.findUnique({ where: { token } });
        if (!stored || stored.expiresAt < new Date()) {
            throw new errorHandler_1.UnauthorizedError("Refresh token inválido ou expirado");
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
        const payload = { userId: decoded.userId, role: decoded.role };
        const tokens = this.generateTokens(payload);
        // Rotacionar refresh token
        await prisma_1.prisma.refreshToken.delete({ where: { token } });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma_1.prisma.refreshToken.create({
            data: { token: tokens.refreshToken, userId: decoded.userId, expiresAt },
        });
        return tokens;
    }
    async logout(refreshToken) {
        await prisma_1.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    async requestPasswordReset(email) {
        const start = Date.now();
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        // Não revelar se o e-mail existe
        if (!user) {
            // Constant-time response to prevent timing-based email enumeration
            const elapsed = Date.now() - start;
            await new Promise((r) => setTimeout(r, Math.max(0, 200 - elapsed)));
            return;
        }
        const token = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2);
        await prisma_1.prisma.passwordReset.create({
            data: { token, userId: user.id, expiresAt },
        });
        // Enviar e-mail com link de reset
        const resetLink = `${env_1.env.FRONTEND_URL}/reset-password?token=${token}`;
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
            await (0, mail_1.sendMail)(user.email, "CondoSync — Redefinição de Senha", htmlContent);
        }
        catch (error) {
            // Log mas não falha — evita revelar se o e-mail existe via tempo de resposta
            logger_1.logger.error("Falha ao enviar e-mail de reset de senha", {
                userId: user.id,
                error,
            });
        }
    }
    async resetPassword(token, newPassword) {
        const reset = await prisma_1.prisma.passwordReset.findFirst({
            where: { token, used: false, expiresAt: { gt: new Date() } },
        });
        if (!reset)
            throw new errorHandler_1.AppError("Token inválido ou expirado", 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, Number(env_1.env.BCRYPT_ROUNDS));
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: reset.userId },
                data: { passwordHash },
            }),
            prisma_1.prisma.passwordReset.update({
                where: { id: reset.id },
                data: { used: true },
            }),
            prisma_1.prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
        ]);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValid)
            throw new errorHandler_1.AppError("Senha atual incorreta", 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, Number(env_1.env.BCRYPT_ROUNDS));
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
            // Invalidar todas as sessões activas [B2]
            prisma_1.prisma.refreshToken.deleteMany({ where: { userId } }),
        ]);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map