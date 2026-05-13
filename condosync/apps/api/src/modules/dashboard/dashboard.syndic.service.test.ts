import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../test/setup';
import { dashboardSyndicService } from './dashboard.syndic.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboardSyndicService.snapshot', () => {
  function setupMocks(txValues: number[]) {
    prismaMock.$transaction.mockImplementation((async (input: any) => {
      if (Array.isArray(input)) return txValues;
      return undefined;
    }) as any);
    prismaMock.charge.count.mockResolvedValue(0);
    (prismaMock.occurrence.groupBy as any).mockResolvedValue([] as any);
    (prismaMock.charge.groupBy as any).mockResolvedValue([] as any);
    prismaMock.unit.findMany.mockResolvedValue([] as any);
  }

  it('occupancyRate = occupiedUnits / totalUnits em %', async () => {
    setupMocks([10, 7, 20, 5, 5, 1, 2, 3, 4, 5]);
    const r = await dashboardSyndicService.snapshot('c1', new Date('2026-05-12'));
    expect(r.kpis.totalUnits).toBe(10);
    expect(r.kpis.occupiedUnits).toBe(7);
    expect(r.kpis.occupancyRate).toBe(70);
  });

  it('inadimplenciaRate = pending / (paid + pending) em %', async () => {
    setupMocks([10, 7, 20, 8, 2, 1, 0, 0, 0, 0]);
    const r = await dashboardSyndicService.snapshot('c1', new Date('2026-05-12'));
    // pending=2, paid=8 → 2/10 = 20%
    expect(r.kpis.inadimplenciaRate).toBe(20);
  });

  it('divisão por zero protegida (totalUnits=0)', async () => {
    setupMocks([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = await dashboardSyndicService.snapshot('c1', new Date('2026-05-12'));
    expect(r.kpis.occupancyRate).toBe(0);
    expect(r.kpis.inadimplenciaRate).toBe(0);
  });

  it('enriquece topInadimplentes com identifier+block da Unit', async () => {
    setupMocks([10, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    (prismaMock.charge.groupBy as any).mockResolvedValue([
      { unitId: 'u1', _count: { unitId: 3 }, _sum: { amount: 1500 } },
    ] as any);
    prismaMock.unit.findMany.mockResolvedValue([
      { id: 'u1', identifier: '101', block: 'A' },
    ] as any);

    const r = await dashboardSyndicService.snapshot('c1', new Date('2026-05-12'));
    expect(r.topInadimplentes).toHaveLength(1);
    expect(r.topInadimplentes[0].unit).toBe('A/101');
    expect(r.topInadimplentes[0].chargesOverdue).toBe(3);
    expect(r.topInadimplentes[0].totalAmount).toBe(1500);
  });

  it('fallback para unitId quando a Unit não é encontrada', async () => {
    setupMocks([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    (prismaMock.charge.groupBy as any).mockResolvedValue([
      { unitId: 'orfã', _count: { unitId: 1 }, _sum: { amount: 100 } },
    ] as any);
    prismaMock.unit.findMany.mockResolvedValue([] as any);

    const r = await dashboardSyndicService.snapshot('c1', new Date('2026-05-12'));
    expect(r.topInadimplentes[0].unit).toBe('orfã');
  });
});
