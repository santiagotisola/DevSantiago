import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Prisma, UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { condominiumService } from './condominium.service';
import { ForbiddenError } from '../../middleware/errorHandler';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed-pw') },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: { write: vi.fn(async () => undefined) },
}));

vi.mock('../residents/resident.service', () => ({
  residentService: {
    assertResidentRoleRequiresUnit: vi.fn(),
    assertResidentUnitBelongsToCondominium: vi.fn(async () => undefined),
  },
}));

import { auditService } from '../audit/audit.service';
import { residentService } from '../residents/resident.service';

const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };
const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const syndic = { userId: 'sy-1', role: UserRole.SYNDIC };

describe('CondominiumService', () => {
  beforeEach(() => {
    prismaMock.condominium.findMany.mockReset();
    prismaMock.condominium.findUnique.mockReset();
    prismaMock.condominium.findUniqueOrThrow.mockReset();
    prismaMock.condominium.create.mockReset();
    prismaMock.condominium.update.mockReset();
    prismaMock.condominium.delete.mockReset();
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.condominiumUser.findMany.mockReset();
    prismaMock.condominiumUser.upsert.mockReset();
    prismaMock.condominiumUser.deleteMany.mockReset();
    prismaMock.plan.findUnique.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.$transaction.mockReset();
    (auditService.write as any).mockReset();
    (residentService.assertResidentRoleRequiresUnit as any).mockReset();
    (residentService.assertResidentUnitBelongsToCondominium as any).mockReset();
  });

  describe('list — scope por role', () => {
    it('SUPER_ADMIN sem where (todos)', async () => {
      prismaMock.condominium.findMany.mockResolvedValue([] as any);
      await condominiumService.list(superAdmin);
      const arg: any = prismaMock.condominium.findMany.mock.calls[0]![0];
      expect(arg.where).toEqual({});
    });

    it('admin filtra por condominiumUsers.some com isActive=true', async () => {
      prismaMock.condominium.findMany.mockResolvedValue([] as any);
      await condominiumService.list(admin);
      const arg: any = prismaMock.condominium.findMany.mock.calls[0]![0];
      expect(arg.where).toEqual({
        condominiumUsers: {
          some: { userId: 'admin-1', isActive: true },
        },
      });
    });
  });

  describe('create — defaults de endereço', () => {
    it('preenche address/city/state/zipCode em branco quando ausentes', async () => {
      prismaMock.condominium.create.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.create({ name: 'Edifício X' });
      const callArg: any = prismaMock.condominium.create.mock.calls[0]![0];
      expect(callArg.data).toMatchObject({
        name: 'Edifício X',
        address: '',
        city: '',
        state: '',
        zipCode: '',
      });
    });

    it('preserva endereço quando fornecido', async () => {
      prismaMock.condominium.create.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.create({
        name: 'X',
        address: 'Rua A',
        city: 'SP',
      });
      const callArg: any = prismaMock.condominium.create.mock.calls[0]![0];
      expect(callArg.data.address).toBe('Rua A');
      expect(callArg.data.city).toBe('SP');
    });
  });

  describe('findById — D1', () => {
    it('SUPER_ADMIN bypass + retorna com _count', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.findById('c-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('fail-closed: admin sem membership recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(condominiumService.findById('c-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.condominium.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('update — D2 + isActive só SUPER_ADMIN', () => {
    it('CONDOMINIUM_ADMIN atualiza campos comuns ok', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominium.update.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.update('c-1', { name: 'Novo nome' }, admin);
      expect(prismaMock.condominium.update).toHaveBeenCalled();
    });

    it('CONDOMINIUM_ADMIN bloqueado ao mudar isActive', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      await expect(
        condominiumService.update('c-1', { isActive: false }, admin),
      ).rejects.toThrow('Apenas super-admin pode ativar ou inativar');
      expect(prismaMock.condominium.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN pode alterar isActive', async () => {
      prismaMock.condominium.update.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.update('c-1', { isActive: false }, superAdmin);
      const callArg: any = prismaMock.condominium.update.mock.calls[0]![0];
      expect(callArg.data.isActive).toBe(false);
    });

    it('SYNDIC com membership atualiza campos comuns', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominium.update.mockResolvedValue({ id: 'c-1' } as any);
      await condominiumService.update('c-1', { phone: '11999' }, syndic);
      expect(prismaMock.condominium.update).toHaveBeenCalled();
    });
  });

  describe('delete — bloqueio por vínculos', () => {
    it('retorna deleted=true + audita quando todos os _count são zero', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        _count: {
          units: 0,
          condominiumUsers: 0,
          contracts: 0,
          financialAccounts: 0,
          employees: 0,
          commonAreas: 0,
          serviceProviders: 0,
          announcements: 0,
          occurrences: 0,
          polls: 0,
          assemblies: 0,
          lostAndFoundItems: 0,
          documents: 0,
          panicAlerts: 0,
          visitorRecurrences: 0,
          chatConversations: 0,
          maintenanceSchedules: 0,
        },
      } as any);
      prismaMock.condominium.delete.mockResolvedValue({} as any);
      const result = await condominiumService.delete('c-1', superAdmin);
      expect(result).toEqual({ deleted: true });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityId: 'c-1' }),
      );
    });

    it('retorna deleted=false + blockers quando há vínculos', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        _count: {
          units: 5,
          condominiumUsers: 3,
          contracts: 0,
          financialAccounts: 0,
          employees: 0,
          commonAreas: 0,
          serviceProviders: 0,
          announcements: 0,
          occurrences: 0,
          polls: 0,
          assemblies: 0,
          lostAndFoundItems: 0,
          documents: 0,
          panicAlerts: 0,
          visitorRecurrences: 0,
          chatConversations: 0,
          maintenanceSchedules: 0,
        },
      } as any);
      const result = await condominiumService.delete('c-1', superAdmin);
      expect(result).toEqual({
        deleted: false,
        blockers: { units: 5, condominiumUsers: 3 },
      });
      expect(prismaMock.condominium.delete).not.toHaveBeenCalled();
      expect(auditService.write).not.toHaveBeenCalled();
    });

    it('P2003 no delete vira blockers={foreignKey:1}', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        _count: {
          units: 0, condominiumUsers: 0, contracts: 0, financialAccounts: 0,
          employees: 0, commonAreas: 0, serviceProviders: 0, announcements: 0,
          occurrences: 0, polls: 0, assemblies: 0, lostAndFoundItems: 0,
          documents: 0, panicAlerts: 0, visitorRecurrences: 0,
          chatConversations: 0, maintenanceSchedules: 0,
        },
      } as any);
      const err = new Prisma.PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: 'x',
      });
      prismaMock.condominium.delete.mockRejectedValue(err);
      const result = await condominiumService.delete('c-1', superAdmin);
      expect(result).toEqual({ deleted: false, blockers: { foreignKey: 1 } });
      expect(auditService.write).not.toHaveBeenCalled();
    });

    it('erro genérico no delete propaga sem transformar', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        _count: {
          units: 0, condominiumUsers: 0, contracts: 0, financialAccounts: 0,
          employees: 0, commonAreas: 0, serviceProviders: 0, announcements: 0,
          occurrences: 0, polls: 0, assemblies: 0, lostAndFoundItems: 0,
          documents: 0, panicAlerts: 0, visitorRecurrences: 0,
          chatConversations: 0, maintenanceSchedules: 0,
        },
      } as any);
      prismaMock.condominium.delete.mockRejectedValue(new Error('db down'));
      await expect(condominiumService.delete('c-1', superAdmin)).rejects.toThrow(
        'db down',
      );
    });
  });

  describe('assignPlan', () => {
    it('atribui plan + audita com planSlug + maxUnits', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        slug: 'pro',
        maxUnits: 50,
        isActive: true,
      } as any);
      prismaMock.condominium.update.mockResolvedValue({
        id: 'c-1',
        maxUnits: 50,
      } as any);
      await condominiumService.assignPlan('c-1', 'pro', undefined, superAdmin);
      const callArg: any = prismaMock.condominium.update.mock.calls[0]![0];
      expect(callArg.data).toEqual({ plan: 'pro', maxUnits: 50 });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSIGN_PLAN',
          metadata: { planSlug: 'pro', maxUnits: 50 },
        }),
      );
    });

    it('override de maxUnits sobrepõe o do plano', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        slug: 'pro',
        maxUnits: 50,
        isActive: true,
      } as any);
      prismaMock.condominium.update.mockResolvedValue({
        id: 'c-1',
        maxUnits: 200,
      } as any);
      await condominiumService.assignPlan('c-1', 'pro', 200, superAdmin);
      const callArg: any = prismaMock.condominium.update.mock.calls[0]![0];
      expect(callArg.data.maxUnits).toBe(200);
    });

    it('rejeita plano inexistente', async () => {
      prismaMock.plan.findUnique.mockResolvedValue(null);
      await expect(
        condominiumService.assignPlan('c-1', 'fantasma', undefined, superAdmin),
      ).rejects.toThrow('Plano inexistente ou inativo');
    });

    it('rejeita plano inativo', async () => {
      prismaMock.plan.findUnique.mockResolvedValue({
        slug: 'old',
        isActive: false,
      } as any);
      await expect(
        condominiumService.assignPlan('c-1', 'old', undefined, superAdmin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.condominium.update).not.toHaveBeenCalled();
    });
  });

  describe('setupAdmin', () => {
    function mockTx(overrides: {
      existing?: any;
      created?: any;
      updated?: any;
      membership?: any;
    } = {}) {
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          user: {
            findUnique: vi.fn().mockResolvedValue(overrides.existing ?? null),
            create: vi
              .fn()
              .mockResolvedValue(overrides.created ?? { id: 'u-new' }),
            update: vi
              .fn()
              .mockResolvedValue(overrides.updated ?? { id: 'u-existing' }),
          },
          condominiumUser: {
            upsert: vi
              .fn()
              .mockResolvedValue(overrides.membership ?? { id: 'm-1' }),
          },
        };
        return cb(tx);
      });
    }

    it('rejeita quando condomínio não existe (findUniqueOrThrow lança)', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockRejectedValue(
        new Error('não encontrado'),
      );
      await expect(
        condominiumService.setupAdmin('c-x', {
          name: 'A',
          email: 'a@b.com',
          password: '123456',
        }),
      ).rejects.toThrow();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('cria user novo quando email não existe', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        id: 'c-1',
      } as any);
      mockTx({ existing: null, created: { id: 'u-new', email: 'a@b.com' } });
      const result = await condominiumService.setupAdmin('c-1', {
        name: 'Admin',
        email: 'a@b.com',
        password: 'pwd123',
      });
      expect(result.user.id).toBe('u-new');
    });

    it('reaproveita user existente atualizando senha + role', async () => {
      prismaMock.condominium.findUniqueOrThrow.mockResolvedValue({
        id: 'c-1',
      } as any);
      mockTx({
        existing: { id: 'u-existing', email: 'a@b.com' },
        updated: { id: 'u-existing', email: 'a@b.com' },
      });
      const result = await condominiumService.setupAdmin('c-1', {
        name: 'Admin',
        email: 'a@b.com',
        password: 'pwd123',
      });
      expect(result.user.id).toBe('u-existing');
    });
  });

  describe('addMember', () => {
    it('chama assertResidentRoleRequiresUnit para qualquer role', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.upsert.mockResolvedValue({} as any);
      await condominiumService.addMember(
        'c-1',
        { userId: 'u-1', role: UserRole.SYNDIC },
        admin,
      );
      expect(residentService.assertResidentRoleRequiresUnit).toHaveBeenCalledWith(
        UserRole.SYNDIC,
        undefined,
      );
      expect(
        residentService.assertResidentUnitBelongsToCondominium,
      ).not.toHaveBeenCalled();
    });

    it('para RESIDENT verifica que unitId pertence ao condomínio', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.upsert.mockResolvedValue({} as any);
      await condominiumService.addMember(
        'c-1',
        { userId: 'u-1', role: UserRole.RESIDENT, unitId: 'unit-1' },
        admin,
      );
      expect(
        residentService.assertResidentUnitBelongsToCondominium,
      ).toHaveBeenCalledWith('c-1', 'unit-1');
    });

    it('fail-closed: ator sem membership do condomínio recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        condominiumService.addMember(
          'c-1',
          { userId: 'u-1', role: UserRole.SYNDIC },
          admin,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.condominiumUser.upsert).not.toHaveBeenCalled();
    });

    it('upsert: cria quando inexistente, reativa quando inativo', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.upsert.mockResolvedValue({} as any);
      await condominiumService.addMember(
        'c-1',
        { userId: 'u-1', role: UserRole.SYNDIC },
        admin,
      );
      const callArg: any = prismaMock.condominiumUser.upsert.mock.calls[0]![0];
      expect(callArg.update).toEqual({
        role: UserRole.SYNDIC,
        unitId: undefined,
        isActive: true,
      });
      expect(callArg.create).toEqual({
        userId: 'u-1',
        condominiumId: 'c-1',
        role: UserRole.SYNDIC,
        unitId: undefined,
      });
    });
  });

  describe('listMembers — D3', () => {
    it('fail-closed: ator sem membership recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        condominiumService.listMembers('c-1', admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.condominiumUser.findMany).not.toHaveBeenCalled();
    });

    it('ordena por joinedAt asc', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.findMany.mockResolvedValue([] as any);
      await condominiumService.listMembers('c-1', admin);
      const callArg: any = prismaMock.condominiumUser.findMany.mock.calls[0]![0];
      expect(callArg.orderBy).toEqual({ joinedAt: 'asc' });
      expect(callArg.where).toEqual({ condominiumId: 'c-1', isActive: true });
    });
  });

  describe('removeMember — D4', () => {
    it('fail-closed: ator sem membership recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        condominiumService.removeMember('c-1', 'u-target', admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.condominiumUser.deleteMany).not.toHaveBeenCalled();
    });

    it('deleta vínculo do target via deleteMany', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.deleteMany.mockResolvedValue({ count: 1 } as any);
      await condominiumService.removeMember('c-1', 'u-target', admin);
      expect(prismaMock.condominiumUser.deleteMany).toHaveBeenCalledWith({
        where: { condominiumId: 'c-1', userId: 'u-target' },
      });
    });
  });
});
