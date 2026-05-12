import { startOfMonth, subMonths, format } from 'date-fns';
import { prisma } from '../../config/prisma';

export const dashboardSyndicService = {
  async snapshot(condominiumId: string, today: Date = new Date()) {
    const monthsBack = 5;
    const months: { label: string; from: Date; to: Date }[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      const ref = subMonths(today, i);
      const from = startOfMonth(ref);
      const to = startOfMonth(subMonths(ref, -1));
      months.push({ label: format(from, 'yyyy-MM'), from, to });
    }

    const [
      totalUnits,
      occupiedUnits,
      activeResidents,
      paidThisMonth,
      pendingThisMonth,
      overdueAll,
      ticketsOpen,
      occurrencesOpen,
      upcomingMaintenances,
      reservationsUpcoming,
    ] = await prisma.$transaction([
      prisma.unit.count({ where: { condominiumId } }),
      prisma.unit.count({ where: { condominiumId, status: 'OCCUPIED' } }),
      prisma.condominiumUser.count({
        where: { condominiumId, isActive: true, role: 'RESIDENT' },
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId },
          status: 'PAID',
          referenceMonth: format(today, 'yyyy-MM'),
        },
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId },
          status: 'PENDING',
          referenceMonth: format(today, 'yyyy-MM'),
        },
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId },
          status: 'PENDING',
          dueDate: { lt: today },
        },
      }),
      prisma.ticket.count({
        where: { condominiumId, status: { in: ['OPEN', 'IN_PROGRESS'] as any } },
      }),
      prisma.occurrence.count({
        where: { condominiumId, status: { in: ['OPEN', 'IN_ANALYSIS'] } },
      }),
      prisma.maintenanceSchedule.count({
        where: {
          condominiumId,
          nextDueDate: { gte: today, lte: subMonths(today, -1) },
        },
      }),
      prisma.reservation.count({
        where: {
          commonArea: { condominiumId },
          startDate: { gte: today, lte: subMonths(today, -1) },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
    ]);

    const chargesByMonth = await Promise.all(
      months.map(async ({ label, from, to }) => {
        const [paid, pending, overdue] = await Promise.all([
          prisma.charge.count({
            where: { unit: { condominiumId }, status: 'PAID', paidAt: { gte: from, lt: to } },
          }),
          prisma.charge.count({
            where: { unit: { condominiumId }, status: 'PENDING', referenceMonth: label },
          }),
          prisma.charge.count({
            where: {
              unit: { condominiumId },
              status: 'PENDING',
              referenceMonth: label,
              dueDate: { lt: today },
            },
          }),
        ]);
        return { month: label, paid, pending, overdue };
      }),
    );

    const occurrencesByStatus = await prisma.occurrence.groupBy({
      by: ['status'],
      where: { condominiumId },
      _count: { status: true },
    });

    const topInadimplentes = await prisma.charge.groupBy({
      by: ['unitId'],
      where: {
        unit: { condominiumId },
        status: 'PENDING',
        dueDate: { lt: today },
      },
      _count: { unitId: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    });
    const unitInfo = await prisma.unit.findMany({
      where: { id: { in: topInadimplentes.map((t) => t.unitId) } },
      select: { id: true, identifier: true, block: true },
    });
    const topInadimplentesEnriched = topInadimplentes.map((t) => {
      const u = unitInfo.find((x) => x.id === t.unitId);
      return {
        unitId: t.unitId,
        unit: u ? `${u.block ? u.block + '/' : ''}${u.identifier}` : t.unitId,
        chargesOverdue: t._count.unitId,
        totalAmount: Number(t._sum.amount ?? 0),
      };
    });

    return {
      kpis: {
        totalUnits,
        occupiedUnits,
        occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
        activeResidents,
        paidThisMonth,
        pendingThisMonth,
        overdueAll,
        inadimplenciaRate:
          paidThisMonth + pendingThisMonth > 0
            ? Math.round((pendingThisMonth / (paidThisMonth + pendingThisMonth)) * 100)
            : 0,
        ticketsOpen,
        occurrencesOpen,
        upcomingMaintenances,
        reservationsUpcoming,
      },
      chargesByMonth,
      occurrencesByStatus: occurrencesByStatus.map((o) => ({
        status: o.status,
        count: o._count.status,
      })),
      topInadimplentes: topInadimplentesEnriched,
    };
  },
};
