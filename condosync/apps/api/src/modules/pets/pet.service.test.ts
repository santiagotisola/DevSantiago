import { describe, expect, it, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { petService } from './pet.service';
import { ForbiddenError } from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('PetService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.unit.findUniqueOrThrow.mockReset();
    prismaMock.pet.findUniqueOrThrow.mockReset();
    prismaMock.pet.findMany.mockReset();
    prismaMock.pet.count.mockReset();
    prismaMock.pet.create.mockReset();
    prismaMock.pet.update.mockReset();
  });

  describe('listByCondominium — multi-tenancy + paginação', () => {
    it('SUPER_ADMIN pula membership e retorna primeira página', async () => {
      prismaMock.pet.findMany.mockResolvedValue([{ id: 'p-1' }] as any);
      prismaMock.pet.count.mockResolvedValue(1);
      const result = await petService.listByCondominium('condo-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
      expect(result.pets).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('admin com membership lista pets do condomínio', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.findMany.mockResolvedValue([] as any);
      prismaMock.pet.count.mockResolvedValue(0);
      await petService.listByCondominium('condo-1', admin, 2, 10);
      expect(prismaMock.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('fail-closed: sem membership lança 403 antes de consultar pets', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(petService.listByCondominium('condo-x', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.pet.findMany).not.toHaveBeenCalled();
    });

    it('calcula totalPages corretamente', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.findMany.mockResolvedValue([] as any);
      prismaMock.pet.count.mockResolvedValue(45);
      const result = await petService.listByCondominium('condo-1', admin, 1, 20);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('listByUnit — guard de unidade', () => {
    it('admin com acesso ao condomínio da unidade lista pets', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({ condominiumId: 'condo-1' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.findMany.mockResolvedValue([] as any);
      await petService.listByUnit('unit-1', admin);
      expect(prismaMock.pet.findMany).toHaveBeenCalled();
    });

    it('fail-closed: sem membership do condomínio da unidade lança 403', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({ condominiumId: 'condo-x' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(petService.listByUnit('unit-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('create — converte datas e checa unidade', () => {
    it('converte birthDate / lastVaccination em Date', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({ condominiumId: 'condo-1' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.create.mockResolvedValue({ id: 'p-new' } as any);
      await petService.create(
        {
          name: 'Rex',
          type: 'DOG',
          unitId: 'unit-1',
          birthDate: '2020-01-15',
          lastVaccination: '2025-06-01',
        },
        admin,
      );
      const callArg: any = prismaMock.pet.create.mock.calls[0]![0];
      expect(callArg.data.birthDate).toBeInstanceOf(Date);
      expect(callArg.data.lastVaccination).toBeInstanceOf(Date);
      expect((callArg.data.birthDate as Date).toISOString()).toContain('2020-01-15');
    });

    it('mantém null quando datas não informadas', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({ condominiumId: 'condo-1' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.create.mockResolvedValue({ id: 'p-new' } as any);
      await petService.create({ name: 'Rex', type: 'DOG', unitId: 'unit-1' }, admin);
      const callArg: any = prismaMock.pet.create.mock.calls[0]![0];
      expect(callArg.data.birthDate).toBeNull();
      expect(callArg.data.lastVaccination).toBeNull();
    });

    it('fail-closed: 403 quando unitId não acessível', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({ condominiumId: 'condo-x' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        petService.create({ name: 'Rex', type: 'DOG', unitId: 'unit-x' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.pet.create).not.toHaveBeenCalled();
    });
  });

  describe('update — IDOR fix (ensurePetAccess)', () => {
    it('admin com membership do condomínio do pet atualiza', async () => {
      prismaMock.pet.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: 'p-1',
          unit: { condominiumId: 'condo-1' },
        } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.update.mockResolvedValue({ id: 'p-1', name: 'Rex2' } as any);
      const result = await petService.update('p-1', { name: 'Rex2' }, admin);
      expect(result.name).toBe('Rex2');
    });

    it('fail-closed: 403 quando pet pertence a outro condomínio', async () => {
      prismaMock.pet.findUniqueOrThrow.mockResolvedValue({
        id: 'p-1',
        unit: { condominiumId: 'condo-other' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(petService.update('p-1', { name: 'x' }, admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.pet.update).not.toHaveBeenCalled();
    });
  });

  describe('delete — soft delete via isActive', () => {
    it('marca isActive=false após guard', async () => {
      prismaMock.pet.findUniqueOrThrow.mockResolvedValue({
        id: 'p-1',
        unit: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.pet.update.mockResolvedValue({ id: 'p-1', isActive: false } as any);
      await petService.delete('p-1', admin);
      expect(prismaMock.pet.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isActive: false },
      });
    });
  });
});
