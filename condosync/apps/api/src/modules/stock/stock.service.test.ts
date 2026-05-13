import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma, UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { stockService } from './stock.service';
import {
  BadRequestError,
  ForbiddenError,
} from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('StockService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.stockItem.findUniqueOrThrow.mockReset();
    prismaMock.stockItem.findMany.mockReset();
    prismaMock.stockItem.create.mockReset();
    prismaMock.stockItem.update.mockReset();
    prismaMock.stockItem.delete.mockReset();
    prismaMock.stockMovement.findMany.mockReset();
    prismaMock.stockMovement.create.mockReset();
    prismaMock.$transaction.mockReset();
  });

  describe('ensureItemAccess', () => {
    it('SUPER_ADMIN sem checar membership', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-1',
        quantity: 10,
        minQuantity: 5,
      } as any);
      const item = await stockService.ensureItemAccess('i-1', superAdmin);
      expect(item.id).toBe('i-1');
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('admin com membership do condomínio do item passa', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-1',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      const item = await stockService.ensureItemAccess('i-1', admin);
      expect(item.id).toBe('i-1');
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-other',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(stockService.ensureItemAccess('i-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('listByCondominium', () => {
    it('filtra por category quando informado', async () => {
      prismaMock.stockItem.findMany.mockResolvedValue([] as any);
      await stockService.listByCondominium('condo-1', { category: 'limpeza' });
      const callArg: any = prismaMock.stockItem.findMany.mock.calls[0]![0];
      expect(callArg.where.category).toBe('limpeza');
    });

    it('aplica filtro lowStock (em memória) — só retorna itens abaixo do mínimo', async () => {
      prismaMock.stockItem.findMany.mockResolvedValue([
        { id: '1', quantity: 2, minQuantity: 5 },
        { id: '2', quantity: 10, minQuantity: 5 },
        { id: '3', quantity: 5, minQuantity: 5 }, // <= conta como low
      ] as any);
      const result = await stockService.listByCondominium('condo-1', {
        lowStock: true,
      });
      expect(result.map((i) => i.id)).toEqual(['1', '3']);
    });

    it('sem lowStock retorna todos', async () => {
      prismaMock.stockItem.findMany.mockResolvedValue([
        { id: '1', quantity: 2, minQuantity: 5 },
        { id: '2', quantity: 10, minQuantity: 5 },
      ] as any);
      const result = await stockService.listByCondominium('condo-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateItem / deleteItem', () => {
    it('updateItem chama guard antes de atualizar', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-1',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.stockItem.update.mockResolvedValue({ id: 'i-1', name: 'X' } as any);
      await stockService.updateItem('i-1', { name: 'X' }, admin);
      expect(prismaMock.stockItem.update).toHaveBeenCalled();
    });

    it('deleteItem cross-tenant é bloqueado', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-other',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(stockService.deleteItem('i-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.stockItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('registerMovement — atomicidade IN/OUT/ADJUSTMENT', () => {
    beforeEach(() => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-1',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
    });

    function mockTransaction(itemUpdate: any, movement: any) {
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          stockItem: { update: vi.fn().mockResolvedValue(itemUpdate) },
          stockMovement: { create: vi.fn().mockResolvedValue(movement) },
        };
        return cb(tx);
      });
    }

    it('IN: usa { increment }', async () => {
      let capturedItemUpdate: any;
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          stockItem: {
            update: vi.fn().mockImplementation((arg) => {
              capturedItemUpdate = arg;
              return { id: 'i-1', quantity: 15 };
            }),
          },
          stockMovement: { create: vi.fn().mockResolvedValue({ id: 'm-1' }) },
        };
        return cb(tx);
      });
      await stockService.registerMovement('i-1', { type: 'IN', quantity: 5 }, admin);
      expect(capturedItemUpdate.data.quantity).toEqual({ increment: 5 });
    });

    it('OUT: usa { decrement }', async () => {
      let capturedItemUpdate: any;
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          stockItem: {
            update: vi.fn().mockImplementation((arg) => {
              capturedItemUpdate = arg;
              return { id: 'i-1', quantity: 5 };
            }),
          },
          stockMovement: { create: vi.fn().mockResolvedValue({ id: 'm-1' }) },
        };
        return cb(tx);
      });
      await stockService.registerMovement('i-1', { type: 'OUT', quantity: 5 }, admin);
      expect(capturedItemUpdate.data.quantity).toEqual({ decrement: 5 });
    });

    it('ADJUSTMENT: set absoluto', async () => {
      let capturedItemUpdate: any;
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          stockItem: {
            update: vi.fn().mockImplementation((arg) => {
              capturedItemUpdate = arg;
              return { id: 'i-1', quantity: 42 };
            }),
          },
          stockMovement: { create: vi.fn().mockResolvedValue({ id: 'm-1' }) },
        };
        return cb(tx);
      });
      await stockService.registerMovement(
        'i-1',
        { type: 'ADJUSTMENT', quantity: 42 },
        admin,
      );
      expect(capturedItemUpdate.data).toEqual({ quantity: 42 });
    });

    it('grava movement com performedBy = actor.userId', async () => {
      let capturedMovement: any;
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          stockItem: {
            update: vi.fn().mockResolvedValue({ id: 'i-1', quantity: 15 }),
          },
          stockMovement: {
            create: vi.fn().mockImplementation((arg) => {
              capturedMovement = arg;
              return { id: 'mov-1' };
            }),
          },
        };
        return cb(tx);
      });
      await stockService.registerMovement(
        'i-1',
        { type: 'IN', quantity: 5, reason: 'compra' },
        admin,
      );
      expect(capturedMovement.data).toMatchObject({
        itemId: 'i-1',
        type: 'IN',
        quantity: 5,
        reason: 'compra',
        performedBy: 'admin-1',
      });
    });

    it('P2010 → BadRequestError "Quantidade insuficiente"', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('check failed', {
        code: 'P2010',
        clientVersion: 'x',
      });
      prismaMock.$transaction.mockRejectedValue(err);
      await expect(
        stockService.registerMovement('i-1', { type: 'OUT', quantity: 999 }, admin),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('mensagem com "stock_quantity_nonneg" → BadRequestError', async () => {
      const err: any = new Error('violates check constraint stock_quantity_nonneg');
      prismaMock.$transaction.mockRejectedValue(err);
      await expect(
        stockService.registerMovement('i-1', { type: 'OUT', quantity: 999 }, admin),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('erro genérico não-CHECK propaga sem transformar', async () => {
      const err = new Error('conexão caiu');
      prismaMock.$transaction.mockRejectedValue(err);
      await expect(
        stockService.registerMovement('i-1', { type: 'IN', quantity: 1 }, admin),
      ).rejects.toThrow('conexão caiu');
    });

    it('fail-closed: guard bloqueia antes de transação', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-other',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        stockService.registerMovement('i-1', { type: 'IN', quantity: 5 }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listMovements', () => {
    it('limita a 100 e ordena desc', async () => {
      prismaMock.stockItem.findUniqueOrThrow.mockResolvedValue({
        id: 'i-1',
        condominiumId: 'condo-1',
        quantity: 10,
        minQuantity: 5,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.stockMovement.findMany.mockResolvedValue([] as any);
      await stockService.listMovements('i-1', admin);
      expect(prismaMock.stockMovement.findMany).toHaveBeenCalledWith({
        where: { itemId: 'i-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });
});
