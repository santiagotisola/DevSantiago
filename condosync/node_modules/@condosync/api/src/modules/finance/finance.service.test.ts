import { describe, it, expect, vi } from 'vitest';
import { financeService } from './finance.service';
import { prismaMock } from '../../test/setup';
import { ChargeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('FinanceService', () => {
  describe('listAccounts', () => {
    it('should return a list of active accounts for a condominium', async () => {
      const mockAccounts = [
        { id: '1', name: 'Conta Corrente', condominiumId: 'condo-1', isActive: true },
        { id: '2', name: 'Fundo de Reserva', condominiumId: 'condo-1', isActive: true },
      ];

      // @ts-ignore - simplificação do mock
      prismaMock.financialAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await financeService.listAccounts('condo-1');

      expect(result).toEqual(mockAccounts);
      expect(prismaMock.financialAccount.findMany).toHaveBeenCalledWith({
        where: { condominiumId: 'condo-1', isActive: true },
        include: { _count: { select: { transactions: true, charges: true } } },
      });
    });
  });

  describe('ratioCharges', () => {
    it('should create equal charges for all occupied units', async () => {
      const mockUnits = [
        { id: 'u1', identifier: '101', fraction: new Decimal(1.0), status: 'OCCUPIED' },
        { id: 'u2', identifier: '102', fraction: new Decimal(1.0), status: 'OCCUPIED' },
      ];

      // @ts-ignore
      prismaMock.unit.findMany.mockResolvedValue(mockUnits);
      prismaMock.charge.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        condominiumId: 'condo-1',
        accountId: 'acc-1',
        description: 'Taxa Condominial',
        totalAmount: 1000,
        dueDate: new Date(),
        referenceMonth: '2024-03',
        method: 'equal' as const,
      };

      const result = await financeService.ratioCharges(dto, 'user-1');

      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(1000);
      expect(prismaMock.charge.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ unitId: 'u1', amount: 500 }),
          expect.objectContaining({ unitId: 'u2', amount: 500 }),
        ]),
      });
    });

    it('should create proportional charges based on unit fraction', async () => {
      const mockUnits = [
        { id: 'u1', identifier: '101', fraction: new Decimal(0.6), status: 'OCCUPIED' },
        { id: 'u2', identifier: '102', fraction: new Decimal(0.4), status: 'OCCUPIED' },
      ];

      // @ts-ignore
      prismaMock.unit.findMany.mockResolvedValue(mockUnits);
      prismaMock.charge.createMany.mockResolvedValue({ count: 2 });

      const dto = {
        condominiumId: 'condo-1',
        accountId: 'acc-1',
        description: 'Taxa Condominial',
        totalAmount: 1000,
        dueDate: new Date(),
        referenceMonth: '2024-03',
        method: 'fraction' as const,
      };

      const result = await financeService.ratioCharges(dto, 'user-1');

      expect(result.count).toBe(2);
      expect(prismaMock.charge.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ unitId: 'u1', amount: 600 }),
          expect.objectContaining({ unitId: 'u2', amount: 400 }),
        ]),
      });
    });

    it('should throw error if no occupied units found', async () => {
      prismaMock.unit.findMany.mockResolvedValue([]);

      const dto = {
        condominiumId: 'condo-1',
        accountId: 'acc-1',
        description: 'Taxa Condominial',
        totalAmount: 1000,
        dueDate: new Date(),
        referenceMonth: '2024-03',
        method: 'equal' as const,
      };

      await expect(financeService.ratioCharges(dto, 'user-1')).rejects.toThrow('Nenhuma unidade ocupada encontrada');
    });
  });
});
