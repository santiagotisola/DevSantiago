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

export class DashboardService {
  async getDashboardData(condominiumId: string) {
    const cacheKey = `dashboard:${condominiumId}`;
    const cachedData = await cache.get<any>(cacheKey);
    if (cachedData) return cachedData;

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const thisMonth = format(today, "yyyy-MM");

    // 1. Dados rápidos (Contagens atuais)
    const [
      totalUnits,
      occupiedUnits,
      visitorsToday,
      visitorsInside,
      parcelsAwaiting,
      openOrders,
      urgentOrders,
      pendingCharges,
      overdueCharges,
      unreadOccurrences,
      upcomingReservations,
      recentAnnouncements,
    ] = await prisma.$transaction([
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
          status: "PENDING",
          dueDate: { lt: new Date() },
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

    // 2. Séries temporais para gráficos (Últimos 7 dias e 6 meses)
    const [visitorsRaw, parcelsRaw, financeRaw] = await prisma.$transaction([
      // Visitantes últimos 7 dias
      prisma.visitor.findMany({
        where: {
          unit: { condominiumId },
          createdAt: { gte: subDays(startOfToday, 6) },
        },
        select: { createdAt: true },
      }),
      // Encomendas últimos 7 dias
      prisma.parcel.findMany({
        where: {
          unit: { condominiumId },
          receivedAt: { gte: subDays(startOfToday, 6) },
        },
        select: { receivedAt: true, status: true },
      }),
      // Financeiro últimos 6 meses (transações pagas)
      prisma.financialTransaction.findMany({
        where: {
          account: { condominiumId },
          paidAt: { gte: subMonths(startOfMonth(today), 5), not: null },
        },
        select: { paidAt: true, type: true, amount: true },
      }),
    ]);

    // 3. Processamento das séries temporais
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

    const last6Months = Array.from({ length: 6 }, (_, i) =>
      subMonths(today, 5 - i),
    );
    const financeStats = last6Months.map((date) => {
      const monthStr = format(date, "yyyy-MM");
      const filtered = financeRaw.filter(
        (f: { paidAt: Date | null }) =>
          f.paidAt && format(f.paidAt, "yyyy-MM") === monthStr,
      );

      const income = filtered
        .filter((f: { type: string; amount: any }) => f.type === "INCOME")
        .reduce(
          (sum: number, f: { amount: any }) => sum + toNumber(f.amount),
          0,
        );
      const expense = filtered
        .filter((f: { type: string; amount: any }) => f.type === "EXPENSE")
        .reduce(
          (sum: number, f: { amount: any }) => sum + toNumber(f.amount),
          0,
        );

      return {
        month: format(date, "MMM"),
        receitas: income,
        despesas: expense,
      };
    });

    const occupancyRate =
      totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

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
        parcelStats,
      },
      maintenance: { openOrders, urgentOrders },
      financial: {
        pendingCharges,
        overdueCharges,
        financeStats,
      },
      communication: { unreadOccurrences, upcomingReservations },
      recentAnnouncements,
    };

    // Cache por 10 minutos (dashboard não muda tão freneticamente)
    await cache.set(cacheKey, data, 600);

    return data;
  }

  async invalidateDashboardCache(condominiumId: string) {
    await cache.del(`dashboard:${condominiumId}`);
  }
}

export const dashboardService = new DashboardService();
