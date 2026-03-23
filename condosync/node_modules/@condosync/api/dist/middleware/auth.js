"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCondominium = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const errorHandler_1 = require("./errorHandler");
const client_1 = require("@prisma/client");
const authenticate = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new errorHandler_1.UnauthorizedError("Token de acesso não fornecido");
    }
    const token = authHeader.slice(7);
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
    // Verificar se o usuário ainda está ativo
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true, role: true },
    });
    if (!user || !user.isActive) {
        throw new errorHandler_1.UnauthorizedError("Usuário inativo ou não encontrado");
    }
    req.user = decoded;
    next();
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            throw new errorHandler_1.UnauthorizedError();
        }
        if (!roles.includes(req.user.role)) {
            throw new errorHandler_1.ForbiddenError("Você não tem permissão para esta ação");
        }
        next();
    };
};
exports.authorize = authorize;
const authorizeCondominium = async (req, _res, next) => {
    if (!req.user)
        throw new errorHandler_1.UnauthorizedError();
    const condominiumId = req.params.condominiumId ||
        req.body.condominiumId ||
        req.query.condominiumId;
    if (!condominiumId)
        return next();
    // Super admin tem acesso total
    if (req.user.role === client_1.UserRole.SUPER_ADMIN)
        return next();
    // Verificar se o usuário pertence ao condomínio
    const membership = await prisma_1.prisma.condominiumUser.findFirst({
        where: { userId: req.user.userId, condominiumId, isActive: true },
    });
    if (!membership) {
        throw new errorHandler_1.ForbiddenError("Acesso negado a este condomínio");
    }
    req.user.condominiumId = condominiumId;
    req.user.role = membership.role;
    next();
};
exports.authorizeCondominium = authorizeCondominium;
//# sourceMappingURL=auth.js.map