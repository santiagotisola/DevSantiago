import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { planService } from './plan.service';
import {
  BadRequestError,
  NotFoundError,
} from '../../middleware/errorHandler';

vi.mock('../audit/audit.service', () => ({
  auditService: { write: vi.fn(async () => undefined) },
}));

import { auditService } from '../audit/audit.service';

const actor = { userId: 'sa-1' };

describe('PlanService', () => {
  beforeEach(() => {
    prismaMock.plan.findMany.mockReset();
    prismaMock.plan.findUnique.mockReset();
    prismaMock.plan.create.mockReset();
    prismaMock.plan.update.mockReset();
    prismaMock.plan.delete.mockReset();
    prismaMock.condominium.count.mockReset();
    (auditService.write as any).mockReset();
  });

  describe('list', () => {
    it('sem filtro retorna todos (isActive desc, price asc)', async () => {
      prismaMock.plan.findMany.mockResolvedValue([] as any);
      await planService.list();
      expect(prismaMock.plan.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
      });
    });

    it('com onlyActive filtra por isActive=true', async () => {
      prismaMock.plan.findMany.mockResolvedValue([] as any);
      await planService.list({ onlyActive: true });
      const arg: any = prismaMock.plan.findMany.mock.calls[0]![0];
      expect(arg.where).toEqual({ isActive: true });
    });
  });

  describe('findById', () => {
    it('retorna plano quando existe', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({ id: 'p-1', slug: 'pro' } as any);
      const result = await planService.findById('p-1');
      expect(result.id).toBe('p-1');
    });

    it('NotFoundError quando não existe', async () => {
      prismaMock.plan.findUnique.mockResolvedValue(null);
      await expect(planService.findById('x')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    it('cria com Decimal para price e default isActive=true', async () => {
      prismaMock.plan.create.mockResolvedValue({
        id: 'p-1',
        slug: 'pro',
        price: new Prisma.Decimal('100'),
      } as any);
      await planService.create(
        { slug: 'pro', name: 'Pro', price: 100 },
        actor,
      );
      const callArg: any = prismaMock.plan.create.mock.calls[0]![0];
      expect(callArg.data.slug).toBe('pro');
      expect(callArg.data.price).toBeInstanceOf(Prisma.Decimal);
      expect(callArg.data.isActive).toBe(true);
    });

    it('features ausente vira JsonNull', async () => {
      prismaMock.plan.create.mockResolvedValue({ id: 'p-1', slug: 'basic' } as any);
      await planService.create({ slug: 'basic', name: 'Basic' }, actor);
      const callArg: any = prismaMock.plan.create.mock.calls[0]![0];
      expect(callArg.data.features).toBe(Prisma.JsonNull);
    });

    it('features array preserva array', async () => {
      prismaMock.plan.create.mockResolvedValue({ id: 'p-1' } as any);
      await planService.create(
        { slug: 'pro', name: 'Pro', features: ['x', 'y'] },
        actor,
      );
      const callArg: any = prismaMock.plan.create.mock.calls[0]![0];
      expect(callArg.data.features).toEqual(['x', 'y']);
    });

    it('grava audit log com slug + price stringificado', async () => {
      prismaMock.plan.create.mockResolvedValue({
        id: 'p-1',
        slug: 'pro',
        price: new Prisma.Decimal('99.90'),
      } as any);
      await planService.create(
        { slug: 'pro', name: 'Pro', price: 99.9 },
        actor,
        { ipAddress: '1.2.3.4', userAgent: 'jest' },
      );
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          module: 'plans',
          entityType: 'Plan',
          entityId: 'p-1',
          metadata: { slug: 'pro', price: '99.9' },
          ipAddress: '1.2.3.4',
        }),
      );
    });

    it('P2002 (slug duplicado) traduzido para BadRequestError', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      });
      prismaMock.plan.create.mockRejectedValue(err);
      await expect(
        planService.create({ slug: 'pro', name: 'Pro' }, actor),
      ).rejects.toBeInstanceOf(BadRequestError);
      // E não chama audit em caso de erro
      expect(auditService.write).not.toHaveBeenCalled();
    });

    it('erro genérico propaga sem transformar', async () => {
      const err = new Error('db down');
      prismaMock.plan.create.mockRejectedValue(err);
      await expect(
        planService.create({ slug: 'pro', name: 'Pro' }, actor),
      ).rejects.toThrow('db down');
    });
  });

  describe('update — preserva 3-way logic de features', () => {
    beforeEach(() => {
      prismaMock.plan.findUnique.mockResolvedValue({ id: 'p-1', slug: 'pro' } as any);
      prismaMock.plan.update.mockResolvedValue({ id: 'p-1', slug: 'pro' } as any);
    });

    it('NotFoundError quando id não existe', async () => {
      prismaMock.plan.findUnique.mockResolvedValueOnce(null);
      await expect(planService.update('x', { name: 'X' }, actor)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(prismaMock.plan.update).not.toHaveBeenCalled();
    });

    it('features=undefined → não atualiza features (mantém valor atual)', async () => {
      await planService.update('p-1', { name: 'Pro 2' }, actor);
      const callArg: any = prismaMock.plan.update.mock.calls[0]![0];
      expect(callArg.data.features).toBeUndefined();
    });

    it('features=null → grava JsonNull (limpa o campo)', async () => {
      await planService.update('p-1', { features: null }, actor);
      const callArg: any = prismaMock.plan.update.mock.calls[0]![0];
      expect(callArg.data.features).toBe(Prisma.JsonNull);
    });

    it('features=array → grava o array', async () => {
      await planService.update('p-1', { features: ['a', 'b'] }, actor);
      const callArg: any = prismaMock.plan.update.mock.calls[0]![0];
      expect(callArg.data.features).toEqual(['a', 'b']);
    });

    it('price=number → Decimal', async () => {
      await planService.update('p-1', { price: 49.9 }, actor);
      const callArg: any = prismaMock.plan.update.mock.calls[0]![0];
      expect(callArg.data.price).toBeInstanceOf(Prisma.Decimal);
    });

    it('grava audit UPDATE com diff em metadata.changes', async () => {
      await planService.update('p-1', { name: 'Novo', price: 50 }, actor, {
        ipAddress: '5.6.7.8',
      });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          metadata: { changes: { name: 'Novo', price: 50 } },
          ipAddress: '5.6.7.8',
        }),
      );
    });
  });

  describe('delete — bloqueio por uso', () => {
    it('NotFoundError quando id não existe', async () => {
      prismaMock.plan.findUnique.mockResolvedValue(null);
      await expect(planService.delete('x', actor)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna { deleted: false, inUse } quando há condomínios usando o slug', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'pro',
      } as any);
      prismaMock.condominium.count.mockResolvedValue(3);
      const result = await planService.delete('p-1', actor);
      expect(result).toEqual({ deleted: false, inUse: 3 });
      expect(prismaMock.plan.delete).not.toHaveBeenCalled();
      expect(auditService.write).not.toHaveBeenCalled();
    });

    it('deleta + audita quando inUse=0', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'pro',
      } as any);
      prismaMock.condominium.count.mockResolvedValue(0);
      prismaMock.plan.delete.mockResolvedValue({} as any);
      const result = await planService.delete('p-1', actor, {
        ipAddress: '9.9.9.9',
      });
      expect(result).toEqual({ deleted: true });
      expect(prismaMock.plan.delete).toHaveBeenCalledWith({
        where: { id: 'p-1' },
      });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entityId: 'p-1',
          ipAddress: '9.9.9.9',
        }),
      );
    });

    it('checa condominium.count via slug, não via id', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        id: 'p-1',
        slug: 'pro-2026',
      } as any);
      prismaMock.condominium.count.mockResolvedValue(0);
      prismaMock.plan.delete.mockResolvedValue({} as any);
      await planService.delete('p-1', actor);
      expect(prismaMock.condominium.count).toHaveBeenCalledWith({
        where: { plan: 'pro-2026' },
      });
    });
  });
});
