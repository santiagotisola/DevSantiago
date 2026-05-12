import { startOfMonth, subMonths, subDays, format } from 'date-fns';
import { prisma } from '../../config/prisma';

export const dashboardSaasService = {
  async snapshot(now: Date = new Date()) {
    const startThisMonth = startOfMonth(now);
    const last30 = subDays(now, 30);
    const last60 = subDays(now, 60);

    const [
      totalCondominiums,
      activeCondominiums,
      newThisMonth,
      totalUsers,
      activeUsers30d,
      activeUsers60d,
      pendingInvitations,
      acceptedInvitations30d,
      pushSubsTotal,
      twoFAEnabled,
    ] = await prisma.$transaction([
      prisma.condominium.count(),
      prisma.condominium.count({ where: { isActive: true } }),
      prisma.condominium.count({ where: { createdAt: { gte: startThisMonth } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: last30 } } }),
      prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: last60 } } }),
      prisma.invitation.count({
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      }),
      prisma.invitation.count({ where: { acceptedAt: { gte: last30 } } }),
      prisma.pushSubscription.count(),
      prisma.user.count({ where: { twoFactorEnabled: true } }),
    ]);

    const condosByPlan = await prisma.condominium.groupBy({
      by: ['plan'],
      where: { isActive: true },
      _count: { plan: true },
    });
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { slug: true, name: true, price: true },
    });
    const planMap = new Map(plans.map((p) => [p.slug, p]));
    let mrr = 0;
    const planBreakdown = condosByPlan.map((c) => {
      const p = planMap.get(c.plan);
      const price = p ? Number(p.price) : 0;
      const monthly = price * c._count.plan;
      mrr += monthly;
      return {
        slug: c.plan,
        name: p?.name ?? c.plan,
        condominiums: c._count.plan,
        pricePerMonth: price,
        mrr: monthly,
      };
    });

    const [condosWithAdmin, condosWithUnits, condosWithResidents, condosWithActiveUse] =
      await Promise.all([
        prisma.condominium.count({
          where: {
            isActive: true,
            condominiumUsers: {
              some: { role: { in: ['CONDOMINIUM_ADMIN', 'SYNDIC'] }, isActive: true },
            },
          },
        }),
        prisma.condominium.count({ where: { isActive: true, units: { some: {} } } }),
        prisma.condominium.count({
          where: {
            isActive: true,
            condominiumUsers: { some: { role: 'RESIDENT', isActive: true } },
          },
        }),
        prisma.condominium.count({
          where: {
            isActive: true,
            condominiumUsers: {
              some: { isActive: true, user: { lastLoginAt: { gte: last30 } } },
            },
          },
        }),
      ]);

    const monthsBack = 5;
    const growthSeries: Array<{ month: string; created: number; cumulative: number }> = [];
    const beforeAll = await prisma.condominium.count({
      where: { createdAt: { lt: startOfMonth(subMonths(now, monthsBack)) } },
    });
    let cumulative = beforeAll;
    for (let i = monthsBack; i >= 0; i--) {
      const ref = subMonths(now, i);
      const monthStart = startOfMonth(ref);
      const monthEnd = startOfMonth(subMonths(ref, -1));
      const created = await prisma.condominium.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      });
      cumulative += created;
      growthSeries.push({ month: format(monthStart, 'yyyy-MM'), created, cumulative });
    }

    const topActive = await prisma.condominiumUser.groupBy({
      by: ['condominiumId'],
      where: { isActive: true, user: { lastLoginAt: { gte: last30 } } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    });
    const condoInfo = await prisma.condominium.findMany({
      where: { id: { in: topActive.map((t) => t.condominiumId) } },
      select: { id: true, name: true, plan: true, maxUnits: true },
    });
    const topActiveEnriched = topActive.map((t) => {
      const c = condoInfo.find((x) => x.id === t.condominiumId);
      return {
        condominiumId: t.condominiumId,
        name: c?.name ?? t.condominiumId,
        plan: c?.plan ?? '—',
        maxUnits: c?.maxUnits ?? 0,
        activeUsers30d: t._count.userId,
      };
    });

    const deactivated30d = await prisma.condominium.count({
      where: { isActive: false, updatedAt: { gte: last30 } },
    });
    const churnBase = activeCondominiums + deactivated30d;
    const churnRate = churnBase > 0 ? Math.round((deactivated30d / churnBase) * 100) : 0;

    return {
      kpis: {
        totalCondominiums,
        activeCondominiums,
        newCondominiumsThisMonth: newThisMonth,
        totalUsers,
        activeUsers30d,
        activeUsers60d,
        dauMau30d:
          activeUsers60d > 0 ? Math.round((activeUsers30d / activeUsers60d) * 100) : 0,
        pendingInvitations,
        acceptedInvitations30d,
        pushSubsTotal,
        twoFAAdoptionPct:
          totalUsers > 0 ? Math.round((twoFAEnabled / totalUsers) * 100) : 0,
        mrr,
        arr: mrr * 12,
        churnRate30d: churnRate,
      },
      planBreakdown,
      adoptionFunnel: {
        total: activeCondominiums,
        withAdmin: condosWithAdmin,
        withUnits: condosWithUnits,
        withResidents: condosWithResidents,
        activeUse30d: condosWithActiveUse,
      },
      growthSeries,
      topActiveCondominiums: topActiveEnriched,
    };
  },
};
