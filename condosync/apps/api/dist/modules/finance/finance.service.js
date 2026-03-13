"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeService = exports.FinanceService = void 0;
const prisma_1 = require("../../config/prisma");
const client_1 = require("@prisma/client");
const errorHandler_1 = require("../../middleware/errorHandler");
const decimal_1 = require("../../utils/decimal");
const gateway_1 = require("../../services/gateway");
const logger_1 = require("../../config/logger");
const date_fns_1 = require("date-fns");
const notification_service_1 = require("../../notifications/notification.service");
class FinanceService {
    // ─── Contas ──────────────────────────────────────────────────
    async listAccounts(condominiumId) {
        return prisma_1.prisma.financialAccount.findMany({
            where: { condominiumId, isActive: true },
            include: {
                _count: { select: { transactions: true, charges: true } },
            },
        });
    }
    async getAccountBalance(accountId) {
        const account = await prisma_1.prisma.financialAccount.findUniqueOrThrow({ where: { id: accountId } });
        const [income, expense] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.financialTransaction.aggregate({
                where: { accountId, type: client_1.FinancialTransactionType.INCOME, paidAt: { not: null } },
                _sum: { amount: true },
            }),
            prisma_1.prisma.financialTransaction.aggregate({
                where: { accountId, type: client_1.FinancialTransactionType.EXPENSE, paidAt: { not: null } },
                _sum: { amount: true },
            }),
        ]);
        const balance = (0, decimal_1.toNumber)(income._sum.amount) - (0, decimal_1.toNumber)(expense._sum.amount);
        return { account, balance, totalIncome: (0, decimal_1.toNumber)(income._sum.amount), totalExpense: (0, decimal_1.toNumber)(expense._sum.amount) };
    }
    // ─── Cobranças ───────────────────────────────────────────────
    async listCharges(condominiumId, filters) {
        const { page = 1, limit = 20, ...where } = filters;
        const [charges, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.charge.findMany({
                where: {
                    unit: { condominiumId },
                    ...(where.unitId && { unitId: where.unitId }),
                    ...(where.status && { status: where.status }),
                    ...(where.referenceMonth && { referenceMonth: where.referenceMonth }),
                },
                include: {
                    unit: { select: { identifier: true, block: true } },
                    category: { select: { name: true } },
                },
                orderBy: [{ dueDate: 'asc' }, { status: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.charge.count({ where: { unit: { condominiumId } } }),
        ]);
        return { charges, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async createCharge(data, createdBy) {
        const charge = await prisma_1.prisma.charge.create({
            data: { ...data, createdBy, status: client_1.ChargeStatus.PENDING },
            include: { unit: { select: { identifier: true, block: true } } },
        });
        const unitUsers = await prisma_1.prisma.condominiumUser.findMany({
            where: { unitId: data.unitId },
            select: { userId: true },
        });
        await Promise.all(unitUsers.map((u) => notification_service_1.NotificationService.enqueue({
            userId: u.userId,
            type: 'FINANCIAL',
            title: 'Nova cobrança gerada',
            message: `Uma nova cobrança no valor de R$ ${Number(data.amount).toFixed(2)} foi gerada com vencimento em ${(0, date_fns_1.format)(new Date(data.dueDate), 'dd/MM/yyyy')}.`,
            data: { chargeId: charge.id, amount: data.amount, dueDate: data.dueDate },
            channels: ['inapp', 'email'],
        })));
        return charge;
    }
    async updateCharge(chargeId, data) {
        return prisma_1.prisma.charge.update({
            where: { id: chargeId },
            data: data,
        });
    }
    async ratioCharges(data, createdBy) {
        const units = await prisma_1.prisma.unit.findMany({
            where: { condominiumId: data.condominiumId, status: 'OCCUPIED' },
        });
        if (units.length === 0)
            throw new errorHandler_1.AppError('Nenhuma unidade ocupada encontrada');
        const totalFraction = units.reduce((sum, u) => sum + u.fraction.toNumber(), 0);
        const chargesData = units.map((unit) => {
            const amount = data.method === 'fraction'
                ? (data.totalAmount * unit.fraction.toNumber()) / totalFraction
                : data.totalAmount / units.length;
            return {
                unitId: unit.id,
                accountId: data.accountId,
                categoryId: data.categoryId,
                description: data.description,
                amount: (0, decimal_1.roundMoney)(amount),
                dueDate: data.dueDate,
                referenceMonth: data.referenceMonth,
                status: client_1.ChargeStatus.PENDING,
                createdBy,
            };
        });
        // Usamos transaction individual para poder capturar IDs e sincronizar
        const createdCharges = await prisma_1.prisma.$transaction(chargesData.map((c) => prisma_1.prisma.charge.create({ data: c, select: { id: true } })));
        // Sincronização assíncrona
        Promise.all(createdCharges.map((c) => this.syncChargeWithGateway(c.id))).catch(e => logger_1.logger.error('Erro na sincronização em lote de cobranças:', e));
        return { count: createdCharges.length, totalAmount: data.totalAmount };
    }
    // ─── Integração com Gateway ──────────────────────────────────
    async syncChargeWithGateway(chargeId) {
        const charge = await prisma_1.prisma.charge.findUnique({
            where: { id: chargeId },
            include: {
                account: true,
            }
        });
        if (!charge || !charge.account.gatewayKey || charge.gatewayId)
            return;
        const gateway = gateway_1.GatewayFactory.getService(charge.account.gatewayType);
        if (!gateway)
            return;
        try {
            const response = await gateway.createPayment(charge, {
                apiKey: charge.account.gatewayKey,
                config: charge.account.gatewayConfig
            });
            return prisma_1.prisma.charge.update({
                where: { id: charge.id },
                data: {
                    gatewayId: response.gatewayId,
                    gatewayStatus: response.gatewayStatus,
                    paymentLink: response.paymentLink,
                    pixQrCode: response.pixQrCode,
                    pixCopyPaste: response.pixCopyPaste,
                    boletoUrl: response.boletoUrl,
                    boletoCode: response.boletoCode,
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Erro ao sincronizar cobrança ${chargeId} com gateway:`, error);
        }
    }
    async markAsPaid(chargeId, paidAmount, paidAt) {
        return prisma_1.prisma.charge.update({
            where: { id: chargeId },
            data: { status: client_1.ChargeStatus.PAID, paidAmount, paidAt: paidAt || new Date() },
        });
    }
    async cancelCharge(chargeId) {
        return prisma_1.prisma.charge.update({
            where: { id: chargeId },
            data: { status: client_1.ChargeStatus.CANCELED },
        });
    }
    // ─── Transações ──────────────────────────────────────────────
    async listTransactions(accountId, filters) {
        const { page = 1, limit = 20, ...where } = filters;
        const [transactions, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.financialTransaction.findMany({
                where: {
                    accountId,
                    ...(where.type && { type: where.type }),
                    ...(where.referenceMonth && { referenceMonth: where.referenceMonth }),
                },
                include: { category: { select: { name: true } } },
                orderBy: { dueDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.financialTransaction.count({ where: { accountId } }),
        ]);
        return { transactions, total, page, limit };
    }
    async createTransaction(data, createdBy) {
        return prisma_1.prisma.financialTransaction.create({ data: { ...data, createdBy } });
    }
    // ─── Relatórios ──────────────────────────────────────────────
    async getMonthlyBalance(condominiumId, year) {
        const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
        const result = await Promise.all(months.map(async (month) => {
            const accounts = await prisma_1.prisma.financialAccount.findMany({
                where: { condominiumId },
                select: { id: true },
            });
            const accountIds = accounts.map((a) => a.id);
            const [income, expense, charged, paid, overdue] = await prisma_1.prisma.$transaction([
                prisma_1.prisma.financialTransaction.aggregate({
                    where: { accountId: { in: accountIds }, type: 'INCOME', referenceMonth: month, paidAt: { not: null } },
                    _sum: { amount: true },
                }),
                prisma_1.prisma.financialTransaction.aggregate({
                    where: { accountId: { in: accountIds }, type: 'EXPENSE', referenceMonth: month, paidAt: { not: null } },
                    _sum: { amount: true },
                }),
                prisma_1.prisma.charge.aggregate({
                    where: { unit: { condominiumId }, referenceMonth: month },
                    _sum: { amount: true },
                }),
                prisma_1.prisma.charge.aggregate({
                    where: { unit: { condominiumId }, referenceMonth: month, status: 'PAID' },
                    _sum: { paidAmount: true },
                }),
                prisma_1.prisma.charge.count({
                    where: { unit: { condominiumId }, referenceMonth: month, status: 'OVERDUE' },
                }),
            ]);
            return {
                month,
                income: (0, decimal_1.toNumber)(income._sum.amount),
                expense: (0, decimal_1.toNumber)(expense._sum.amount),
                charged: (0, decimal_1.toNumber)(charged._sum.amount),
                paid: (0, decimal_1.toNumber)(paid._sum.paidAmount),
                overdueCount: overdue,
                balance: (0, decimal_1.toNumber)(income._sum.amount) - (0, decimal_1.toNumber)(expense._sum.amount),
            };
        }));
        return result;
    }
    async getDefaulters(condominiumId) {
        const now = new Date();
        return prisma_1.prisma.charge.findMany({
            where: {
                unit: { condominiumId },
                status: client_1.ChargeStatus.PENDING,
                dueDate: { lt: now },
            },
            include: { unit: { select: { identifier: true, block: true } } },
            orderBy: { dueDate: 'asc' },
        });
    }
    async getChargesByUnit(unitId) {
        const [pending, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.charge.findMany({
                where: { unitId, status: { in: ['PENDING', 'OVERDUE'] } },
                orderBy: { dueDate: 'asc' },
            }),
            prisma_1.prisma.charge.aggregate({ where: { unitId }, _sum: { amount: true } }),
        ]);
        return { pending, total: (0, decimal_1.toNumber)(total._sum.amount) };
    }
    async getFinancialForecast(condominiumId) {
        const now = new Date();
        const sixMonthsAgo = (0, date_fns_1.subMonths)((0, date_fns_1.startOfMonth)(now), 6);
        // 1. Média de despesas dos últimos 6 meses
        const expenses = await prisma_1.prisma.financialTransaction.findMany({
            where: {
                account: { condominiumId },
                type: 'EXPENSE',
                paidAt: { gte: sixMonthsAgo },
            },
            select: { amount: true, paidAt: true },
        });
        const monthlyExpenses = {};
        expenses.forEach((e) => {
            const month = (0, date_fns_1.format)(e.paidAt, 'yyyy-MM');
            monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (0, decimal_1.toNumber)(e.amount);
        });
        const expenseValues = Object.values(monthlyExpenses);
        const averageExpense = expenseValues.length > 0
            ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
            : 0;
        // 2. Receita esperada (baseado no total de unidades e taxa média)
        // Aqui usamos o total de unidades ocupadas para prever o próximo rateio
        const unitCount = await prisma_1.prisma.unit.count({ where: { condominiumId, status: 'OCCUPIED' } });
        // Pegamos o valor total do último rateio como base
        const lastCharge = await prisma_1.prisma.charge.findFirst({
            where: { unit: { condominiumId } },
            orderBy: { createdAt: 'desc' },
            select: { amount: true },
        });
        const baseAmountPerUnit = lastCharge ? (0, decimal_1.toNumber)(lastCharge.amount) : 0;
        const expectedRevenue = unitCount * baseAmountPerUnit;
        return {
            averageExpense: (0, decimal_1.roundMoney)(averageExpense),
            expectedRevenue: (0, decimal_1.roundMoney)(expectedRevenue),
            suggestedReserve: (0, decimal_1.roundMoney)(expectedRevenue * 0.1), // 10% de margEM
            forecastBalance: (0, decimal_1.roundMoney)(expectedRevenue - averageExpense),
            safetyMargin: averageExpense > 0 ? ((expectedRevenue - averageExpense) / averageExpense) * 100 : 100,
        };
    }
}
exports.FinanceService = FinanceService;
exports.financeService = new FinanceService();
//# sourceMappingURL=finance.service.js.map