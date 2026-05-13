import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../../test/setup';

vi.mock('../../utils/cache', () => ({
  cache: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
  },
}));

import { cache } from '../../utils/cache';
import { dashboardService } from './dashboard.service';

describe('DashboardService', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    (cache.get as any).mockReset();
    (cache.set as any).mockReset();
    (cache.del as any).mockReset();
    (cache.get as any).mockResolvedValue(null);
  });

  afterEach(() => vi.useRealTimers());

  describe('getDashboardData — cache hit', () => {
    it('retorna do cache sem consultar prisma', async () => {
      const cached = { summary: { totalUnits: 100 } };
      (cache.get as any).mockResolvedValue(cached);
      const result = await dashboardService.getDashboardData('c-1');
      expect(result).toBe(cached);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardData — cache miss', () => {
    function setupTransactionsForCounts(overrides: number[] = []) {
      // 12 counts + 1 findMany (announcements), depois 3 findMany para séries
      const defaultCounts = [
        100, // totalUnits
        75, // occupiedUnits
        12, // visitorsToday
        3, // visitorsInside
        7, // parcelsAwaiting
        4, // openOrders
        1, // urgentOrders
        15, // pendingCharges
        2, // overdueCharges
        5, // unreadOccurrences
        8, // upcomingReservations
      ];
      const counts = overrides.length ? overrides : defaultCounts;
      const announcements = [
        { id: 'ann-1', isPinned: true, title: 'Aviso' },
      ];
      prismaMock.$transaction
        .mockResolvedValueOnce([...counts, announcements] as any)
        .mockResolvedValueOnce([[], [], []] as any); // visitorsRaw, parcelsRaw, financeRaw
    }

    it('compõe summary com occupancyRate arredondado a 1 decimal', async () => {
      setupTransactionsForCounts();
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.summary).toEqual({
        totalUnits: 100,
        occupiedUnits: 75,
        occupancyRate: 75.0,
      });
    });

    it('occupancyRate=0 quando totalUnits=0 (divisão por zero protegida)', async () => {
      setupTransactionsForCounts([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.summary.occupancyRate).toBe(0);
    });

    it('arredonda occupancyRate para 1 casa: 7/3 → 233.3? não, 1/3 → 33.3', async () => {
      setupTransactionsForCounts([3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.summary.occupancyRate).toBe(33.3);
    });

    it('compõe portaria + maintenance + financial + communication corretamente', async () => {
      setupTransactionsForCounts([100, 75, 12, 3, 7, 4, 1, 15, 2, 5, 8]);
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.portaria).toMatchObject({
        visitorsToday: 12,
        visitorsInside: 3,
        parcelsAwaiting: 7,
      });
      expect(result.maintenance).toEqual({ openOrders: 4, urgentOrders: 1 });
      expect(result.financial).toMatchObject({
        pendingCharges: 15,
        overdueCharges: 2,
      });
      expect(result.communication).toEqual({
        unreadOccurrences: 5,
        upcomingReservations: 8,
      });
    });

    it('grava no cache por 600s ao final', async () => {
      setupTransactionsForCounts();
      await dashboardService.getDashboardData('c-1');
      expect(cache.set).toHaveBeenCalledWith(
        'dashboard:c-1',
        expect.any(Object),
        600,
      );
    });

    it('visitorStats / parcelStats têm 7 dias e financeStats 6 meses', async () => {
      setupTransactionsForCounts();
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.portaria.visitorStats).toHaveLength(7);
      expect(result.portaria.parcelStats).toHaveLength(7);
      expect(result.financial.financeStats).toHaveLength(6);
    });

    it('agrupa visitorStats por dia (yyyy-MM-dd)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-13T10:00:00Z'));

      const defaultCounts = [
        100, 75, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ];
      const announcements: any[] = [];
      prismaMock.$transaction
        .mockResolvedValueOnce([...defaultCounts, announcements] as any)
        .mockResolvedValueOnce([
          [
            { createdAt: new Date('2026-05-13T10:00:00Z') },
            { createdAt: new Date('2026-05-13T11:00:00Z') },
            { createdAt: new Date('2026-05-12T15:00:00Z') },
          ],
          [],
          [],
        ] as any);

      const result = await dashboardService.getDashboardData('c-1');
      // Total de visitantes na série deve ser 3
      const totalVisitors = result.portaria.visitorStats.reduce(
        (s: number, d: any) => s + d.visitantes,
        0,
      );
      expect(totalVisitors).toBe(3);
    });

    it('financeStats soma INCOME e EXPENSE por mês', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));

      const defaultCounts = [
        100, 75, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ];
      const announcements: any[] = [];
      prismaMock.$transaction
        .mockResolvedValueOnce([...defaultCounts, announcements] as any)
        .mockResolvedValueOnce([
          [],
          [],
          [
            { paidAt: new Date('2026-05-10'), type: 'INCOME', amount: new Prisma.Decimal(1000) },
            { paidAt: new Date('2026-05-12'), type: 'INCOME', amount: new Prisma.Decimal(500) },
            { paidAt: new Date('2026-05-08'), type: 'EXPENSE', amount: new Prisma.Decimal(200) },
            { paidAt: new Date('2026-04-20'), type: 'INCOME', amount: new Prisma.Decimal(800) },
          ],
        ] as any);

      const result = await dashboardService.getDashboardData('c-1');
      const may = result.financial.financeStats.find(
        (m: any) => m.month === 'May',
      );
      expect(may).toBeDefined();
      expect(may!.receitas).toBe(1500);
      expect(may!.despesas).toBe(200);
      const apr = result.financial.financeStats.find(
        (m: any) => m.month === 'Apr',
      );
      expect(apr!.receitas).toBe(800);
    });

    it('inclui recentAnnouncements limitado a 5 (do mock)', async () => {
      setupTransactionsForCounts();
      const result = await dashboardService.getDashboardData('c-1');
      expect(result.recentAnnouncements).toEqual([
        { id: 'ann-1', isPinned: true, title: 'Aviso' },
      ]);
    });
  });

  describe('invalidateDashboardCache', () => {
    it('chama cache.del com a key correta', async () => {
      await dashboardService.invalidateDashboardCache('c-1');
      expect(cache.del).toHaveBeenCalledWith('dashboard:c-1');
    });
  });
});
