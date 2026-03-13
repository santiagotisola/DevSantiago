"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const prisma_1 = require("../../config/prisma");
const cache_1 = require("../../utils/cache");
const date_fns_1 = require("date-fns");
const decimal_1 = require("../../utils/decimal");
class DashboardService {
    async getDashboardData(condominiumId) {
        const cacheKey = `dashboard:${condominiumId}`;
        const cachedData = await cache_1.cache.get(cacheKey);
        if (cachedData)
            return cachedData;
        const today = new Date();
        const startOfToday = (0, date_fns_1.startOfDay)(today);
        const endOfToday = (0, date_fns_1.endOfDay)(today);
        const thisMonth = (0, date_fns_1.format)(today, 'yyyy-MM');
        // 1. Dados rápidos (Contagens atuais)
        const [totalUnits, occupiedUnits, visitorsToday, visitorsInside, parcelsAwaiting, openOrders, urgentOrders, pendingCharges, overdueCharges, unreadOccurrences, upcomingReservations, recentAnnouncements,] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.unit.count({ where: { condominiumId } }),
            prisma_1.prisma.unit.count({ where: { condominiumId, status: 'OCCUPIED' } }),
            prisma_1.prisma.visitor.count({
                where: {
                    unit: { condominiumId },
                    createdAt: { gte: startOfToday, lte: endOfToday },
                },
            }),
            prisma_1.prisma.visitor.count({ where: { unit: { condominiumId }, status: 'INSIDE' } }),
            prisma_1.prisma.parcel.count({
                where: {
                    unit: { condominiumId },
                    status: { in: ['RECEIVED', 'NOTIFIED'] },
                },
            }),
            prisma_1.prisma.serviceOrder.count({ where: { condominiumId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] } } }),
            prisma_1.prisma.serviceOrder.count({ where: { condominiumId, priority: 'URGENT', status: { notIn: ['COMPLETED', 'CANCELED'] } } }),
            prisma_1.prisma.charge.count({
                where: { unit: { condominiumId }, status: 'PENDING', referenceMonth: thisMonth },
            }),
            prisma_1.prisma.charge.count({
                where: {
                    unit: { condominiumId },
                    status: 'PENDING',
                    dueDate: { lt: new Date() },
                },
            }),
            prisma_1.prisma.occurrence.count({ where: { condominiumId, status: { in: ['OPEN', 'IN_ANALYSIS'] } } }),
            prisma_1.prisma.reservation.count({
                where: {
                    commonArea: { condominiumId },
                    status: 'CONFIRMED',
                    startDate: { gte: new Date() },
                },
            }),
            prisma_1.prisma.announcement.findMany({
                where: {
                    condominiumId,
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
                take: 5,
            }),
        ]);
        // 2. Séries temporais para gráficos (Últimos 7 dias e 6 meses)
        const [visitorsRaw, parcelsRaw, financeRaw] = await prisma_1.prisma.$transaction([
            // Visitantes últimos 7 dias
            prisma_1.prisma.visitor.findMany({
                where: { unit: { condominiumId }, createdAt: { gte: (0, date_fns_1.subDays)(startOfToday, 6) } },
                select: { createdAt: true },
            }),
            // Encomendas últimos 7 dias
            prisma_1.prisma.parcel.findMany({
                where: { unit: { condominiumId }, receivedAt: { gte: (0, date_fns_1.subDays)(startOfToday, 6) } },
                select: { receivedAt: true, status: true },
            }),
            // Financeiro últimos 6 meses (transações pagas)
            prisma_1.prisma.financialTransaction.findMany({
                where: {
                    account: { condominiumId },
                    paidAt: { gte: (0, date_fns_1.subMonths)((0, date_fns_1.startOfMonth)(today), 5), not: null },
                },
                select: { paidAt: true, type: true, amount: true },
            }),
        ]);
        // 3. Processamento das séries temporais
        const last7Days = Array.from({ length: 7 }, (_, i) => (0, date_fns_1.subDays)(today, 6 - i));
        const visitorStats = last7Days.map(date => {
            const dateStr = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
            const count = visitorsRaw.filter((v) => (0, date_fns_1.format)(v.createdAt, 'yyyy-MM-dd') === dateStr).length;
            return { day: (0, date_fns_1.format)(date, 'eee'), visitantes: count };
        });
        const parcelStats = last7Days.map(date => {
            const dateStr = (0, date_fns_1.format)(date, 'yyyy-MM-dd');
            const filtered = parcelsRaw.filter((p) => (0, date_fns_1.format)(p.receivedAt, 'yyyy-MM-dd') === dateStr);
            return {
                day: (0, date_fns_1.format)(date, 'eee'),
                recebidas: filtered.length,
                entregues: filtered.filter((p) => p.status === 'DELIVERED').length
            };
        });
        const last6Months = Array.from({ length: 6 }, (_, i) => (0, date_fns_1.subMonths)(today, 5 - i));
        const financeStats = last6Months.map(date => {
            const monthStr = (0, date_fns_1.format)(date, 'yyyy-MM');
            const filtered = financeRaw.filter((f) => f.paidAt && (0, date_fns_1.format)(f.paidAt, 'yyyy-MM') === monthStr);
            const income = filtered.filter((f) => f.type === 'INCOME').reduce((sum, f) => sum + (0, decimal_1.toNumber)(f.amount), 0);
            const expense = filtered.filter((f) => f.type === 'EXPENSE').reduce((sum, f) => sum + (0, decimal_1.toNumber)(f.amount), 0);
            return { month: (0, date_fns_1.format)(date, 'MMM'), receitas: income, despesas: expense };
        });
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
        const data = {
            summary: {
                totalUnits,
                occupiedUnits,
                occupancyRate: Math.round(occupancyRate * 10) / 10,
            },
            portaria: {
                visitorsToday,
                visitorsInside,
                parcelsAwaiting,
                visitorStats,
                parcelStats
            },
            maintenance: { openOrders, urgentOrders },
            financial: {
                pendingCharges,
                overdueCharges,
                financeStats
            },
            communication: { unreadOccurrences, upcomingReservations },
            recentAnnouncements,
        };
        // Cache por 10 minutos (dashboard não muda tão freneticamente)
        await cache_1.cache.set(cacheKey, data, 600);
        return data;
    }
    async invalidateDashboardCache(condominiumId) {
        await cache_1.cache.del(`dashboard:${condominiumId}`);
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
//# sourceMappingURL=dashboard.service.js.map