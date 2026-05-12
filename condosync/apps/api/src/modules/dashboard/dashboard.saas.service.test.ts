import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../test/setup';
import { dashboardSaasService } from './dashboard.saas.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboardSaasService.snapshot', () => {
  function setupCommonMocks(overrides: Partial<Record<string, any>> = {}) {
    // $transaction recebe array de promises; o vitest-mock-extended não resolve
    // individualmente, então retornamos o array de valores na ordem esperada.
    prismaMock.$transaction.mockImplementation((async (input: any) => {
      if (Array.isArray(input)) {
        return overrides.transactionResult ?? [
          10, // totalCondominiums
          8, // activeCondominiums
          1, // newThisMonth
          50, // totalUsers
          30, // activeUsers30d
          40, // activeUsers60d
          5, // pendingInvitations
          7, // acceptedInvitations30d
          25, // pushSubsTotal
          12, // twoFAEnabled
        ];
      }
      return undefined;
    }) as any);

    prismaMock.condominium.groupBy.mockResolvedValue([
      { plan: 'basic', _count: { plan: 5 } },
      { plan: 'professional', _count: { plan: 3 } },
    ] as any);
    prismaMock.plan.findMany.mockResolvedValue([
      { slug: 'basic', name: 'Basic', price: 0 },
      { slug: 'professional', name: 'Pro', price: 100 },
    ] as any);

    prismaMock.condominium.count.mockResolvedValue(0);
    prismaMock.condominiumUser.groupBy.mockResolvedValue([] as any);
    prismaMock.condominium.findMany.mockResolvedValue([] as any);
  }

  it('calcula MRR/ARR corretamente a partir dos planos', async () => {
    setupCommonMocks();
    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    // 5 basic × 0 + 3 pro × 100 = 300
    expect(r.kpis.mrr).toBe(300);
    expect(r.kpis.arr).toBe(3600);
  });

  it('calcula DAU/MAU como % (activeUsers30d / activeUsers60d)', async () => {
    setupCommonMocks();
    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    // 30 / 40 = 75%
    expect(r.kpis.dauMau30d).toBe(75);
  });

  it('calcula churn rate como % de desativados sobre base ativa+desativada', async () => {
    setupCommonMocks();
    // Override: deactivated30d (último count call) = 2, activeCondominiums=8 (do tx)
    let countCalls = 0;
    prismaMock.condominium.count.mockImplementation((async () => {
      countCalls++;
      // Os primeiros counts são adoption funnel + growth + beforeAll;
      // o último é deactivated30d.
      // Para simplificar: retornar 2 nos últimos counts.
      return 2;
    }) as any);

    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    // churnBase = 8 + 2 = 10 → 2/10 = 20%
    expect(r.kpis.churnRate30d).toBe(20);
  });

  it('twoFA adoption pct = twoFAEnabled / totalUsers', async () => {
    setupCommonMocks();
    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    // 12 / 50 = 24%
    expect(r.kpis.twoFAAdoptionPct).toBe(24);
  });

  it('lida com totalUsers=0 sem dividir por zero', async () => {
    setupCommonMocks({
      transactionResult: [10, 8, 1, 0, 0, 0, 5, 7, 25, 0],
    });
    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    expect(r.kpis.twoFAAdoptionPct).toBe(0);
    expect(r.kpis.dauMau30d).toBe(0);
  });

  it('planBreakdown não inclui planos órfãos (slug sem Plan row) com price 0', async () => {
    setupCommonMocks();
    prismaMock.condominium.groupBy.mockResolvedValue([
      { plan: 'orfao', _count: { plan: 2 } },
    ] as any);

    const r = await dashboardSaasService.snapshot(new Date('2026-05-12'));
    expect(r.planBreakdown).toHaveLength(1);
    expect(r.planBreakdown[0].pricePerMonth).toBe(0);
    expect(r.planBreakdown[0].condominiums).toBe(2);
  });
});
