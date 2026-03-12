"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const validateRequest_1 = require("../../utils/validateRequest");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'A senha deve ter ao menos 1 maiúscula e 1 número'),
    phone: zod_1.z.string().optional(),
    cpf: zod_1.z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const refreshSchema = zod_1.z.object({ refreshToken: zod_1.z.string() });
const emailSchema = zod_1.z.object({ email: zod_1.z.string().email() });
const resetSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
class AuthController {
    async register(req, res) {
        const data = (0, validateRequest_1.validateRequest)(registerSchema, req.body);
        const result = await auth_service_1.authService.register(data);
        res.status(201).json({ success: true, data: result });
    }
    async login(req, res) {
        const data = (0, validateRequest_1.validateRequest)(loginSchema, req.body);
        const result = await auth_service_1.authService.login(data, req.ip);
        res.json({ success: true, data: result });
    }
    async refresh(req, res) {
        const { refreshToken } = (0, validateRequest_1.validateRequest)(refreshSchema, req.body);
        const tokens = await auth_service_1.authService.refreshTokens(refreshToken);
        res.json({ success: true, data: tokens });
    }
    async logout(req, res) {
        const { refreshToken } = (0, validateRequest_1.validateRequest)(refreshSchema, req.body);
        await auth_service_1.authService.logout(refreshToken);
        res.json({ success: true, message: 'Logout realizado com sucesso' });
    }
    async me(req, res) {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../config/prisma')));
        const user = await prisma.user.findUniqueOrThrow({
            where: { id: req.user.userId },
            select: {
                id: true, name: true, email: true, phone: true, cpf: true,
                avatarUrl: true, role: true, emailVerified: true, lastLoginAt: true,
                condominiumUsers: {
                    where: { isActive: true },
                    include: { condominium: { select: { id: true, name: true, logoUrl: true } } },
                },
            },
        });
        res.json({ success: true, data: { user } });
    }
    async requestPasswordReset(req, res) {
        const { email } = (0, validateRequest_1.validateRequest)(emailSchema, req.body);
        await auth_service_1.authService.requestPasswordReset(email);
        res.json({ success: true, message: 'Se o e-mail existir, você receberá instruções de recuperação' });
    }
    async resetPassword(req, res) {
        const data = (0, validateRequest_1.validateRequest)(resetSchema, req.body);
        await auth_service_1.authService.resetPassword(data.token, data.newPassword);
        res.json({ success: true, message: 'Senha alterada com sucesso' });
    }
    async changePassword(req, res) {
        const data = (0, validateRequest_1.validateRequest)(changePasswordSchema, req.body);
        await auth_service_1.authService.changePassword(req.user.userId, data.currentPassword, data.newPassword);
        res.json({ success: true, message: 'Senha alterada com sucesso' });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map