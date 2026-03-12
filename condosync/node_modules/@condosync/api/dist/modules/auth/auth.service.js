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
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new errorHandler_1.ConflictError('Este e-mail já está cadastrado');
        if (data.cpf) {
            const cpfExists = await prisma_1.prisma.user.findUnique({ where: { cpf: data.cpf } });
            if (cpfExists)
                throw new errorHandler_1.ConflictError('Este CPF já está cadastrado');
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, Number(env_1.env.BCRYPT_ROUNDS));
        const user = await prisma_1.prisma.user.create({
            data: {
                ...data,
                passwordHash,
                role: 'RESIDENT',
            },
            select: {
                id: true, name: true, email: true, phone: true, role: true, createdAt: true,
            },
        });
        return { user };
    }
    async login(data, ipAddress) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
            select: {
                id: true, name: true, email: true, role: true,
                passwordHash: true, isActive: true, avatarUrl: true,
                condominiumUsers: {
                    where: { isActive: true },
                    include: { condominium: { select: { id: true, name: true, logoUrl: true } } },
                },
            },
        });
        if (!user)
            throw new errorHandler_1.UnauthorizedError('E-mail ou senha inválidos');
        if (!user.isActive)
            throw new errorHandler_1.UnauthorizedError('Conta desativada. Contate o suporte.');
        const isValidPassword = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isValidPassword)
            throw new errorHandler_1.UnauthorizedError('E-mail ou senha inválidos');
        const payload = { userId: user.id, role: user.role };
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
            throw new errorHandler_1.UnauthorizedError('Refresh token inválido ou expirado');
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
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        // Não revelar se o e-mail existe
        if (!user)
            return;
        const token = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2);
        await prisma_1.prisma.passwordReset.create({
            data: { token, userId: user.id, expiresAt },
        });
        // TODO: enviar e-mail com link de reset
        return { token }; // em produção, apenas enviar por e-mail
    }
    async resetPassword(token, newPassword) {
        const reset = await prisma_1.prisma.passwordReset.findFirst({
            where: { token, used: false, expiresAt: { gt: new Date() } },
        });
        if (!reset)
            throw new errorHandler_1.AppError('Token inválido ou expirado', 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, Number(env_1.env.BCRYPT_ROUNDS));
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
            prisma_1.prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
            prisma_1.prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
        ]);
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValid)
            throw new errorHandler_1.AppError('Senha atual incorreta', 400);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, Number(env_1.env.BCRYPT_ROUNDS));
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map