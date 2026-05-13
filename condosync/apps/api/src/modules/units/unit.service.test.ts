import { describe, expect, it, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { unitService } from './unit.service';
import { ForbiddenError } from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };
const otherCondoAdmin = { userId: 'admin-2', role: UserRole.CONDOMINIUM_ADMIN };

describe('UnitService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.unit.findMany.mockReset();
    prismaMock.unit.findUniqueOrThrow.mockReset();
    prismaMock.unit.create.mockReset();
    prismaMock.unit.update.mockReset();
  });

  describe('list — multi-tenancy', () => {
    it('SUPER_ADMIN pula checagem de membership', async () => {
      prismaMock.unit.findMany.mockResolvedValue([] as any);
      await unitService.list('condo-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ condominiumId: 'condo-1' }) }),
      );
    });

    it('admin com membership ativa lista', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.unit.findMany.mockResolvedValue([{ id: 'u-1' }] as any);
      const result = await unitService.list('condo-1', admin);
      expect(result).toHaveLength(1);
      expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
        where: { userId: 'admin-1', condominiumId: 'condo-1', isActive: true },
      });
    });

    it('fail-closed: admin sem membership recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(unitService.list('condo-1', otherCondoAdmin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.unit.findMany).not.toHaveBeenCalled();
    });

    it('aplica filtro de status quando informado', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.unit.findMany.mockResolvedValue([] as any);
      await unitService.list('condo-1', admin, 'OCCUPIED');
      expect(prismaMock.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ condominiumId: 'condo-1', status: 'OCCUPIED' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('resolve quando ator pertence ao condomínio da unidade', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        id: 'u-1',
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      const result = await unitService.findById('u-1', admin);
      expect(result.id).toBe('u-1');
    });

    it('403 quando unidade pertence a outro condomínio', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        id: 'u-1',
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(unitService.findById('u-1', admin)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('create', () => {
    it('cria quando ator tem acesso ao condomínio alvo', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.unit.create.mockResolvedValue({ id: 'u-new' } as any);
      const result = await unitService.create(
        { condominiumId: 'condo-1', identifier: '101' },
        admin,
      );
      expect(result.id).toBe('u-new');
      expect(prismaMock.unit.create).toHaveBeenCalledWith({
        data: { condominiumId: 'condo-1', identifier: '101' },
      });
    });

    it('fail-closed: não cria sem membership', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        unitService.create({ condominiumId: 'condo-x', identifier: '101' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.unit.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('atualiza ao validar acesso pela unidade', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.unit.update.mockResolvedValue({ id: 'u-1', notes: 'x' } as any);
      const result = await unitService.update('u-1', { notes: 'x' }, admin);
      expect(result.notes).toBe('x');
    });

    it('fail-closed: 403 quando ator não pertence ao condomínio da unidade', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(unitService.update('u-1', { notes: 'x' }, admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.unit.update).not.toHaveBeenCalled();
    });
  });
});
