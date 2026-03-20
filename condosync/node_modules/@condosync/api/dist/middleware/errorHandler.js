"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.RateLimitError = exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
const logger_1 = require("../config/logger");
class AppError extends Error {
    constructor(message, statusCode = 400, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(resource = 'Recurso', id) {
        const msg = id
            ? `${resource} com ID "${id}" não encontrado`
            : `${resource} não encontrado`;
        super(msg, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Não autorizado') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 422, 'VALIDATION_ERROR');
        this.details = details || {};
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Limite de requisições excedido') {
        super(message, 429, 'RATE_LIMIT');
    }
}
exports.RateLimitError = RateLimitError;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'APP_ERROR',
                message: err.message,
                ...(err instanceof ValidationError && Object.keys(err.details).length > 0 && { details: err.details }),
            },
        });
    }
    // Erros do Prisma
    if (err.name === 'PrismaClientKnownRequestError' || err.name === 'NotFoundError') {
        const prismaErr = err;
        if (prismaErr.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'UNIQUE_CONSTRAINT',
                    message: `Já existe um registro com este ${prismaErr.meta?.target?.join(', ') || 'valor'}`,
                },
            });
        }
        if (prismaErr.code === 'P2025' || err.name === 'NotFoundError') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Registro não encontrado' },
            });
        }
        if (prismaErr.code === 'P2003' || prismaErr.code === 'P2014' || prismaErr.code === 'P2023') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Referência não encontrada' },
            });
        }
    }
    // Erros JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Token inválido' },
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' },
        });
    }
    logger_1.logger.error('Erro não tratado:', { error: err.message, stack: err.stack });
    return res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro interno do servidor',
        },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map