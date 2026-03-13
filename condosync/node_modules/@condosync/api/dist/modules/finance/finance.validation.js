"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransactionSchema = exports.paySchema = exports.ratioSchema = exports.updateChargeSchema = exports.createChargeSchema = void 0;
const zod_1 = require("zod");
// ─── Cobranças ──────────────────────────────────────────────
exports.createChargeSchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid(),
    accountId: zod_1.z.string().uuid(),
    categoryId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    dueDate: zod_1.z.string().datetime(),
    referenceMonth: zod_1.z.string().optional(),
    interestRate: zod_1.z.number().min(0).optional(),
    penaltyAmount: zod_1.z.number().min(0).optional(),
});
exports.updateChargeSchema = exports.createChargeSchema.partial();
exports.ratioSchema = zod_1.z.object({
    condominiumId: zod_1.z.string().uuid(),
    accountId: zod_1.z.string().uuid(),
    categoryId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    totalAmount: zod_1.z.number().positive('Valor total deve ser positivo'),
    dueDate: zod_1.z.string().datetime(),
    referenceMonth: zod_1.z.string(),
    method: zod_1.z.enum(['equal', 'fraction']),
});
exports.paySchema = zod_1.z.object({
    paidAmount: zod_1.z.number().positive('Valor pago deve ser positivo'),
    paidAt: zod_1.z.string().datetime().optional(),
});
// ─── Transações ─────────────────────────────────────────────
exports.createTransactionSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid(),
    categoryId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.enum(['INCOME', 'EXPENSE']),
    amount: zod_1.z.number().positive('Valor deve ser positivo'),
    description: zod_1.z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    dueDate: zod_1.z.string().datetime(),
    paidAt: zod_1.z.string().datetime().optional(),
    referenceMonth: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=finance.validation.js.map