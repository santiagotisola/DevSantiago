"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const auth_1 = require("../../middleware/auth");
const decimal_1 = require("../../utils/decimal");
const report_service_1 = require("./report.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN'));
// Relatório de visitantes por período
router.get('/visitors/:condominiumId', async (req, res) => {
    const { startDate, endDate } = req.query;
    const visitors = await prisma_1.prisma.visitor.findMany({
        where: {
            unit: { condominiumId: req.params.condominiumId },
            createdAt: {
                gte: startDate ? new Date(startDate) : new Date(new Date().setDate(1)),
                lte: endDate ? new Date(endDate) : new Date(),
            },
        },
        include: { unit: { select: { identifier: true, block: true } } },
        orderBy: { createdAt: 'desc' },
    });
    const stats = {
        total: visitors.length,
        authorized: visitors.filter((v) => v.status === 'AUTHORIZED' || v.status === 'INSIDE' || v.status === 'LEFT').length,
        denied: visitors.filter((v) => v.status === 'DENIED').length,
        avgDurationMs: visitors
            .filter((v) => v.entryAt && v.exitAt)
            .reduce((sum, v) => sum + (v.exitAt.getTime() - v.entryAt.getTime()), 0) / (visitors.filter((v) => v.entryAt && v.exitAt).length || 1),
    };
    res.json({ success: true, data: { visitors, stats } });
});
// Relatório financeiro
router.get('/financial/:condominiumId', async (req, res) => {
    const { referenceMonth } = req.query;
    const [income, expenses, charged, collected, defaulters] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.financialTransaction.aggregate({
            where: {
                account: { condominiumId: req.params.condominiumId },
                type: 'INCOME',
                ...(referenceMonth && { referenceMonth: referenceMonth }),
                paidAt: { not: null },
            },
            _sum: { amount: true },
            _count: true,
        }),
        prisma_1.prisma.financialTransaction.aggregate({
            where: {
                account: { condominiumId: req.params.condominiumId },
                type: 'EXPENSE',
                ...(referenceMonth && { referenceMonth: referenceMonth }),
                paidAt: { not: null },
            },
            _sum: { amount: true },
            _count: true,
        }),
        prisma_1.prisma.charge.aggregate({
            where: {
                unit: { condominiumId: req.params.condominiumId },
                ...(referenceMonth && { referenceMonth: referenceMonth }),
            },
            _sum: { amount: true },
            _count: true,
        }),
        prisma_1.prisma.charge.aggregate({
            where: {
                unit: { condominiumId: req.params.condominiumId },
                status: 'PAID',
                ...(referenceMonth && { referenceMonth: referenceMonth }),
            },
            _sum: { paidAmount: true },
            _count: true,
        }),
        prisma_1.prisma.charge.count({
            where: {
                unit: { condominiumId: req.params.condominiumId },
                status: 'PENDING',
                dueDate: { lt: new Date() },
            },
        }),
    ]);
    const chargedTotal = (0, decimal_1.toNumber)(charged._sum.amount);
    const collectedTotal = (0, decimal_1.toNumber)(collected._sum.paidAmount);
    const incomeTotal = (0, decimal_1.toNumber)(income._sum.amount);
    const expensesTotal = (0, decimal_1.toNumber)(expenses._sum.amount);
    const collectionRate = chargedTotal
        ? (collectedTotal / chargedTotal) * 100
        : 0;
    res.json({
        success: true,
        data: {
            income: { total: incomeTotal, count: income._count },
            expenses: { total: expensesTotal, count: expenses._count },
            charges: { total: chargedTotal, count: charged._count },
            collected: { total: collectedTotal, count: collected._count },
            defaulters,
            collectionRate: Math.round(collectionRate * 10) / 10,
            balance: incomeTotal - expensesTotal,
        },
    });
});
// Relatório de manutenção
router.get('/maintenance/:condominiumId', async (req, res) => {
    const [byStatus, byPriority, byCategory, avgResolutionTime] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.serviceOrder.groupBy({
            by: ['status'],
            where: { condominiumId: req.params.condominiumId },
            _count: true,
            orderBy: { status: 'asc' },
        }),
        prisma_1.prisma.serviceOrder.groupBy({
            by: ['priority'],
            where: { condominiumId: req.params.condominiumId },
            _count: true,
            orderBy: { priority: 'asc' },
        }),
        prisma_1.prisma.serviceOrder.groupBy({
            by: ['category'],
            where: { condominiumId: req.params.condominiumId },
            _count: true,
            orderBy: { category: 'asc' },
        }),
        prisma_1.prisma.serviceOrder.findMany({
            where: { condominiumId: req.params.condominiumId, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
            select: { startedAt: true, completedAt: true },
        }),
    ]);
    const avgMs = avgResolutionTime.length
        ? avgResolutionTime.reduce((sum, o) => sum + (o.completedAt.getTime() - o.startedAt.getTime()), 0) / avgResolutionTime.length
        : 0;
    res.json({
        success: true,
        data: {
            byStatus,
            byPriority,
            byCategory,
            avgResolutionHours: Math.round(avgMs / 3600000),
        },
    });
});
// Relatório de ocupação
router.get('/occupancy/:condominiumId', async (req, res) => {
    const [total, occupied, vacant, renovation] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.unit.count({ where: { condominiumId: req.params.condominiumId } }),
        prisma_1.prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'OCCUPIED' } }),
        prisma_1.prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'VACANT' } }),
        prisma_1.prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'UNDER_RENOVATION' } }),
    ]);
    res.json({
        success: true,
        data: {
            total, occupied, vacant, renovation,
            occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
        },
    });
});
// Download de PDF da prestação de contas
router.get('/financial/:condominiumId/pdf', async (req, res) => {
    const { referenceMonth } = req.query;
    if (!referenceMonth) {
        return res.status(400).json({ success: false, message: 'Mês de referência é obrigatório' });
    }
    const pdfBuffer = await report_service_1.reportService.generateFinancialPdf(req.params.condominiumId, referenceMonth);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prestacao-contas-${referenceMonth}.pdf`);
    res.send(pdfBuffer);
});
exports.default = router;
//# sourceMappingURL=report.routes.js.map