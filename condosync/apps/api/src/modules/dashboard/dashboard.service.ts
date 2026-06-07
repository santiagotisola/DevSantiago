import { prisma } from "../../config/prisma";
import { cache } from "../../utils/cache";
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { toNumber } from "../../utils/decimal";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getRecentActivity(condominiumId: string) {
  const [visitors, parcels, tickets, orders] = await Promise.all([
    prisma.visitor.findMany({
      where: { unit: { condominiumId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true, unit: { select: { identifier: true } } },
    }),
    prisma.parcel.findMany({
      where: { unit: { condominiumId } },
      orderBy: { receivedAt: "desc" },
      take: 5,
      select: { id: true, description: true, receivedAt: true, unit: { select: { identifier: true } } },
    }),
    prisma.ticket.findMany({
      where: { condominiumId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.serviceOrder.findMany({
      where: { condominiumId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  const activities = [
    ...visitors.map((v) => ({
      id: v.id,
      type: "visitor" as const,
      description: `Visitante ${v.name} — ${v.status === "INSIDE" ? "entrou" : v.status === "LEFT" ? "saiu" : "aguardando"}`,
      detail: `Unidade ${v.unit.identifier}`,
      createdAt: v.createdAt,
    })),
    ...parcels.map((p) => ({
      id: p.id,
      type: "parcel" as const,
      description: `Encomenda recebida${p.description ? `: ${p.description}` : ""}`,
      detail: `Unidade ${p.unit.identifier}`,
      createdAt: p.receivedAt,
    })),
    ...tickets.map((t) => ({
      id: t.id,
      type: "ticket" as const,
      description: `Chamado: ${t.title}`,
      detail: t.status,
      createdAt: t.createdAt,
    })),
    ...orders.map((o) => ({
      id: o.id,
      type: "maintenance" as const,
      description: `Manutenção: ${o.title}`,
      detail: o.status,
      createdAt: o.createdAt,
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

async function getMonthlyFinancials(condominiumId: string, months: number) {
  const today = new Date();
  const startDate = subMonths(startOfMonth(today), months - 1);

  const transactions = await prisma.financialTransaction.findMany({
    where: {
      account: { condominiumId },
      paidAt: { gte: startDate, not: null },
    },
    select: { paidAt: true, type: true, amount: true },
  });

  const last6Months = Array.from({ length: months }, (_, i) =>
    subMonths(today, months - 1 - i),
  );

  return last6Months.map((date) => {
    const monthStr = format(date, "yyyy-MM");
    const filtered = transactions.filter(
      (f) => f.paidAt && format(f.paidAt, "yyyy-MM") === monthStr,
    );

    const income = filtered
      .filter((f) => f.type === "INCOME")
      .reduce((sum, f) => sum + toNumber(f.amount), 0);
    const expense = filtered
      .filter((f) => f.type === "EXPENSE")
      .reduce((sum, f) => sum + toNumber(f.amount), 0);

    return { month: format(date, "MMM/yy"), receitas: income, despesas: expense };
  });
}

async function getTicketsByStatus(condominiumId: string) {
  const [open, inProgress, closed] = await Promise.all([
    prisma.ticket.count({ where: { condominiumId, status: "OPEN" } }),
    prisma.ticket.count({ where: { condominiumId, status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { condominiumId, status: "CLOSED" } }),
  ]);
  return { open, inProgress, closed };
}

// ─── Service ────────────────────────────────────────────────────────────────

export class DashboardService {
  async getDashboardData(condominiumId: string) {
    const cacheKey = `dashboard:${condominiumId}`;
    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) return cachedData;

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const thisMonth = format(today, "yyyy-MM");
    const monthStart = startOfMonth(today);

    // 1. Contagens principais (paralelo)
    const [
      totalResidents,
      totalUnits,
      occupiedUnits,
      visitorsToday,
      visitorsInside,
      pendingVisitors,
      parcelsAwaiting,
      openOrders,
      urgentOrders,
      openTickets,
      pendingCharges,
      overdueCharges,
      unreadOccurrences,
      upcomingReservations,
      recentAnnouncements,
    ] = await prisma.$transaction([
      prisma.condominiumUser.count({
        where: { condominiumId, role: "RESIDENT", isActive: true },
      }),
      prisma.unit.count({ where: { condominiumId } }),
      prisma.unit.count({ where: { condominiumId, status: "OCCUPIED" } }),
      prisma.visitor.count({
        where: {
          unit: { condominiumId },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.visitor.count({
        where: { unit: { condominiumId }, status: "INSIDE" },
      }),
      prisma.visitor.count({
        where: { unit: { condominiumId }, status: "PENDING" },
      }),
      prisma.parcel.count({
        where: {
          unit: { condominiumId },
          status: { in: ["RECEIVED", "NOTIFIED"] },
        },
      }),
      prisma.serviceOrder.count({
        where: {
          condominiumId,
          status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PARTS"] },
        },
      }),
      prisma.serviceOrder.count({
        where: {
          condominiumId,
          priority: "URGENT",
          status: { notIn: ["COMPLETED", "CANCELED"] },
        },
      }),
      prisma.ticket.count({
        where: { condominiumId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId },
          status: "PENDING",
          referenceMonth: thisMonth,
        },
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId },
          status: "OVERDUE",
        },
      }),
      prisma.occurrence.count({
        where: { condominiumId, status: { in: ["OPEN", "IN_ANALYSIS"] } },
      }),
      prisma.reservation.count({
        where: {
          commonArea: { condominiumId },
          status: "CONFIRMED",
          startDate: { gte: new Date() },
        },
      }),
      prisma.announcement.findMany({
        where: {
          condominiumId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: 5,
      }),
    ]);

    // 2. Receita do mês
    const monthlyRevenueAgg = await prisma.financialTransaction.aggregate({
      where: {
        account: { condominiumId },
        type: "INCOME",
        paidAt: { gte: monthStart, not: null },
      },
      _sum: { amount: true },
    });
    const monthlyRevenue = monthlyRevenueAgg._sum.amount
      ? toNumber(monthlyRevenueAgg._sum.amount)
      : 0;

    // 3. Próximas assembleias
    const upcomingAssemblies = await prisma.assembly.findMany({
      where: { condominiumId, scheduledAt: { gte: new Date() } },
      take: 3,
      orderBy: { scheduledAt: "asc" },
      select: { id: true, title: true, scheduledAt: true, status: true },
    });

    // 4. Séries temporais e dados de gráfico (paralelo)
    const [recentActivity, financialChart, ticketsByStatus, visitorsRaw, parcelsRaw] =
      await Promise.all([
        getRecentActivity(condominiumId),
        getMonthlyFinancials(condominiumId, 6),
        getTicketsByStatus(condominiumId),
        prisma.visitor.findMany({
          where: {
            unit: { condominiumId },
            createdAt: { gte: subDays(startOfToday, 6) },
          },
          select: { createdAt: true },
        }),
        prisma.parcel.findMany({
          where: {
            unit: { condominiumId },
            receivedAt: { gte: subDays(startOfToday, 6) },
          },
          select: { receivedAt: true, status: true },
        }),
      ]);

    // 5. Processamento das séries temporais (7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) =>
      subDays(today, 6 - i),
    );

    const visitorStats = last7Days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const count = visitorsRaw.filter(
        (v: { createdAt: Date }) =>
          format(v.createdAt, "yyyy-MM-dd") === dateStr,
      ).length;
      return { day: format(date, "eee"), visitantes: count };
    });

    const parcelStats = last7Days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const filtered = parcelsRaw.filter(
        (p: { receivedAt: Date; status: string }) =>
          format(p.receivedAt, "yyyy-MM-dd") === dateStr,
      );
      return {
        day: format(date, "eee"),
        recebidas: filtered.length,
        entregues: filtered.filter(
          (p: { status: string }) => p.status === "DELIVERED",
        ).length,
      };
    });

    const occupancyRate =
      totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const data = {
      metrics: {
        totalResidents,
        totalUnits,
        occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        pendingVisitors,
        parcelsAwaiting,
        openTickets,
        openMaintenanceOrders: openOrders,
        monthlyRevenue,
        overdueCharges,
      },
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
        parcelStats,
      },
      maintenance: { openOrders, urgentOrders },
      financial: {
        pendingCharges,
        overdueCharges,
        monthlyRevenue,
        financeStats: financialChart,
      },
      communication: { unreadOccurrences, upcomingReservations },
      recentAnnouncements,
      upcomingAssemblies,
      recentActivity,
      financialChart,
      ticketsByStatus,
    };

    // Cache por 5 minutos
    await cache.set(cacheKey, data, 300);

    return data;
  }

  async invalidateDashboardCache(condominiumId: string) {
    await cache.del(`dashboard:${condominiumId}`);
  }
}

export const dashboardService = new DashboardService();
