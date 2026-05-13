import { describe, expect, it, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { serviceProviderService } from './serviceProvider.service';
import { ForbiddenError } from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('ServiceProviderService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.serviceProvider.findMany.mockReset();
    prismaMock.serviceProvider.findUniqueOrThrow.mockReset();
    prismaMock.serviceProvider.create.mockReset();
    prismaMock.serviceProvider.update.mockReset();
    prismaMock.serviceProvider.delete.mockReset();
  });

  describe('listByCondominium', () => {
    it('sem filtro de approved', async () => {
      prismaMock.serviceProvider.findMany.mockResolvedValue([] as any);
      await serviceProviderService.listByCondominium('condo-1');
      const callArg: any = prismaMock.serviceProvider.findMany.mock.calls[0]![0];
      expect(callArg.where).toEqual({ condominiumId: 'condo-1' });
    });

    it('aplica filtro isApproved=true', async () => {
      prismaMock.serviceProvider.findMany.mockResolvedValue([] as any);
      await serviceProviderService.listByCondominium('condo-1', { approved: true });
      const callArg: any = prismaMock.serviceProvider.findMany.mock.calls[0]![0];
      expect(callArg.where.isApproved).toBe(true);
    });

    it('aplica filtro isApproved=false', async () => {
      prismaMock.serviceProvider.findMany.mockResolvedValue([] as any);
      await serviceProviderService.listByCondominium('condo-1', { approved: false });
      const callArg: any = prismaMock.serviceProvider.findMany.mock.calls[0]![0];
      expect(callArg.where.isApproved).toBe(false);
    });
  });

  describe('create — L4 (tenant check)', () => {
    const baseData = {
      condominiumId: 'condo-1',
      name: 'ACME',
      serviceType: 'elétrica',
      phone: '11999999999',
    };

    it('SUPER_ADMIN cria sem membership check', async () => {
      prismaMock.serviceProvider.create.mockResolvedValue({ id: 'p-1' } as any);
      await serviceProviderService.create(baseData, superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('admin com membership cria', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.serviceProvider.create.mockResolvedValue({ id: 'p-1' } as any);
      const result = await serviceProviderService.create(baseData, admin);
      expect(result.id).toBe('p-1');
    });

    it('fail-closed: 403 sem membership', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(serviceProviderService.create(baseData, admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.serviceProvider.create).not.toHaveBeenCalled();
    });
  });

  describe('update — L1 (IDOR fix)', () => {
    it('atualiza ao validar acesso pelo condomínio do provider', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.serviceProvider.update.mockResolvedValue({ id: 'p-1', name: 'Novo' } as any);
      const result = await serviceProviderService.update('p-1', { name: 'Novo' }, admin);
      expect(result.name).toBe('Novo');
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        serviceProviderService.update('p-1', { name: 'X' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.serviceProvider.update).not.toHaveBeenCalled();
    });
  });

  describe('approve — L2 (IDOR fix)', () => {
    it('define isApproved=true após guard', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.serviceProvider.update.mockResolvedValue({ id: 'p-1' } as any);
      await serviceProviderService.approve('p-1', admin);
      expect(prismaMock.serviceProvider.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isApproved: true },
      });
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(serviceProviderService.approve('p-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('delete — L3 (IDOR fix)', () => {
    it('deleta após guard', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.serviceProvider.delete.mockResolvedValue({} as any);
      await serviceProviderService.delete('p-1', admin);
      expect(prismaMock.serviceProvider.delete).toHaveBeenCalledWith({
        where: { id: 'p-1' },
      });
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.serviceProvider.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(serviceProviderService.delete('p-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.serviceProvider.delete).not.toHaveBeenCalled();
    });
  });
});
