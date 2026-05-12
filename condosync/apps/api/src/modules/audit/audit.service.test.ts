import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../test/setup';
import { auditService } from './audit.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auditService.write', () => {
  it('persiste com defaults nulos para campos opcionais', async () => {
    prismaMock.auditLog.create.mockResolvedValue({} as any);
    await auditService.write({
      action: 'LOGIN',
      module: 'auth',
      description: 'ok',
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    const call = prismaMock.auditLog.create.mock.calls[0][0] as any;
    expect(call.data.userId).toBeNull();
    expect(call.data.condominiumId).toBeNull();
    expect(call.data.entityType).toBeNull();
    expect(call.data.entityId).toBeNull();
    expect(call.data.ipAddress).toBeNull();
    expect(call.data.userAgent).toBeNull();
    expect(call.data.action).toBe('LOGIN');
    expect(call.data.description).toBe('ok');
  });

  it('NUNCA lança em caso de erro — silencia para não quebrar o caller', async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      auditService.write({ action: 'X', module: 'm', description: 'd' }),
    ).resolves.toBeUndefined();
  });
});

describe('auditService.list', () => {
  it('aplica filtros e paginação', async () => {
    prismaMock.auditLog.count.mockResolvedValue(42);
    prismaMock.auditLog.findMany.mockResolvedValue([{ id: 'a' }] as any);
    const r = await auditService.list({
      condominiumId: 'c1',
      module: 'auth',
      page: 2,
      pageSize: 10,
    });
    expect(r.total).toBe(42);
    expect(r.page).toBe(2);
    expect(r.pageSize).toBe(10);
    expect(r.items).toHaveLength(1);
    const args = prismaMock.auditLog.findMany.mock.calls[0][0] as any;
    expect(args.where).toMatchObject({ condominiumId: 'c1', module: 'auth' });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
  });

  it('clamp em pageSize máximo (100)', async () => {
    prismaMock.auditLog.count.mockResolvedValue(0);
    prismaMock.auditLog.findMany.mockResolvedValue([] as any);
    const r = await auditService.list({ pageSize: 9999 });
    expect(r.pageSize).toBe(100);
  });

  it('aplica filtros from/to em createdAt', async () => {
    prismaMock.auditLog.count.mockResolvedValue(0);
    prismaMock.auditLog.findMany.mockResolvedValue([] as any);
    const from = new Date('2026-01-01');
    const to = new Date('2026-02-01');
    await auditService.list({ from, to });
    const args = prismaMock.auditLog.findMany.mock.calls[0][0] as any;
    expect(args.where.createdAt).toEqual({ gte: from, lte: to });
  });
});
