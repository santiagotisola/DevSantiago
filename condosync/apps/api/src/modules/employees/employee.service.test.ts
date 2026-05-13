import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import {
  employeeService,
  normalizeShift,
  SHIFT_ALIASES,
} from './employee.service';
import {
  ConflictError,
  ForbiddenError,
} from '../../middleware/errorHandler';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed-pw') },
}));

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('normalizeShift', () => {
  it('mapeia FULL_TIME → FULL_DAY', () => {
    expect(normalizeShift('FULL_TIME')).toBe('FULL_DAY');
  });
  it('mapeia ON_CALL → MORNING', () => {
    expect(normalizeShift('ON_CALL')).toBe('MORNING');
  });
  it('passa valores válidos sem alterar', () => {
    expect(normalizeShift('AFTERNOON')).toBe('AFTERNOON');
  });
  it('retorna undefined para entrada vazia', () => {
    expect(normalizeShift(undefined)).toBeUndefined();
  });
  it('alias table contém apenas mapeamentos legados', () => {
    expect(Object.keys(SHIFT_ALIASES).sort()).toEqual(['FULL_TIME', 'ON_CALL']);
  });
});

describe('EmployeeService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.condominiumUser.findUnique.mockReset();
    prismaMock.condominiumUser.create.mockReset();
    prismaMock.condominiumUser.update.mockReset();
    prismaMock.condominiumUser.updateMany.mockReset();
    prismaMock.employee.findUniqueOrThrow.mockReset();
    prismaMock.employee.findMany.mockReset();
    prismaMock.employee.create.mockReset();
    prismaMock.employee.update.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
  });

  describe('listByCondominium', () => {
    it('SUPER_ADMIN pula membership', async () => {
      prismaMock.employee.findMany.mockResolvedValue([] as any);
      await employeeService.listByCondominium('condo-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('fail-closed: sem membership lança 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        employeeService.listByCondominium('condo-1', admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.employee.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('admissionDate default = now quando não fornecida', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.employee.create.mockResolvedValue({ id: 'e-1' } as any);
      await employeeService.create(
        { condominiumId: 'condo-1', name: 'João', role: 'Porteiro' },
        admin,
      );
      const callArg: any = prismaMock.employee.create.mock.calls[0]![0];
      expect(callArg.data.admissionDate).toBeInstanceOf(Date);
      expect(callArg.data.shift).toBe('MORNING');
      expect(callArg.data.cpf).toBe('');
    });

    it('converte admissionDate string em Date', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.employee.create.mockResolvedValue({} as any);
      await employeeService.create(
        {
          condominiumId: 'condo-1',
          name: 'João',
          role: 'Porteiro',
          admissionDate: '2025-01-15T00:00:00Z',
        },
        admin,
      );
      const callArg: any = prismaMock.employee.create.mock.calls[0]![0];
      expect(callArg.data.admissionDate).toBeInstanceOf(Date);
      expect((callArg.data.admissionDate as Date).toISOString()).toBe(
        '2025-01-15T00:00:00.000Z',
      );
    });

    it('fail-closed: 403 sem membership', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        employeeService.create(
          { condominiumId: 'condo-x', name: 'X', role: 'Y' },
          admin,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.employee.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('atualiza após validar acesso pelo condomínio do employee', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.employee.update.mockResolvedValue({ id: 'e-1', name: 'Novo' } as any);
      const result = await employeeService.update('e-1', { name: 'Novo' }, admin);
      expect(result.name).toBe('Novo');
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        employeeService.update('e-1', { name: 'Novo' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.employee.update).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('marca isActive=false após guard', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.employee.update.mockResolvedValue({} as any);
      await employeeService.softDelete('e-1', admin);
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { id: 'e-1' },
        data: { isActive: false },
      });
    });
  });

  describe('grantAccess', () => {
    const baseEmployee = {
      id: 'e-1',
      condominiumId: 'condo-1',
      name: 'João',
      userId: null,
    };
    const grantData = {
      email: 'joao@x.com',
      password: 'Strong@2026',
      systemRole: 'DOORMAN' as const,
    };

    it('cria user novo + membership + vincula employee.userId', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue(baseEmployee as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'u-new' } as any);
      prismaMock.condominiumUser.findUnique.mockResolvedValue(null);
      prismaMock.condominiumUser.create.mockResolvedValue({} as any);
      prismaMock.employee.update.mockResolvedValue({} as any);

      await employeeService.grantAccess('e-1', grantData, admin);

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.condominiumUser.create).toHaveBeenCalledWith({
        data: {
          userId: 'u-new',
          condominiumId: 'condo-1',
          role: 'DOORMAN',
          isActive: true,
        },
      });
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { id: 'e-1' },
        data: { userId: 'u-new' },
      });
    });

    it('reaproveita user existente sem chamar user.create', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue(baseEmployee as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-existing' } as any);
      prismaMock.condominiumUser.findUnique.mockResolvedValue(null);
      prismaMock.condominiumUser.create.mockResolvedValue({} as any);
      prismaMock.employee.update.mockResolvedValue({} as any);

      await employeeService.grantAccess('e-1', grantData, admin);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { id: 'e-1' },
        data: { userId: 'u-existing' },
      });
    });

    it('atualiza membership existente em vez de criar duplicada', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue(baseEmployee as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-existing' } as any);
      prismaMock.condominiumUser.findUnique.mockResolvedValue({
        userId: 'u-existing',
      } as any);
      prismaMock.condominiumUser.update.mockResolvedValue({} as any);
      prismaMock.employee.update.mockResolvedValue({} as any);

      await employeeService.grantAccess('e-1', grantData, admin);

      expect(prismaMock.condominiumUser.create).not.toHaveBeenCalled();
      expect(prismaMock.condominiumUser.update).toHaveBeenCalled();
    });

    it('Conflict 409 quando employee já tem userId', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        ...baseEmployee,
        userId: 'u-old',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);

      await expect(
        employeeService.grantAccess('e-1', grantData, admin),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('fail-closed: 403 sem membership do condomínio do employee', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue(baseEmployee as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

      await expect(
        employeeService.grantAccess('e-1', grantData, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeAccess', () => {
    it('desativa membership e desvincula userId', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        id: 'e-1',
        condominiumId: 'condo-1',
        userId: 'u-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.condominiumUser.updateMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.employee.update.mockResolvedValue({} as any);

      await employeeService.revokeAccess('e-1', admin);

      expect(prismaMock.condominiumUser.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', condominiumId: 'condo-1' },
        data: { isActive: false },
      });
      expect(prismaMock.employee.update).toHaveBeenCalledWith({
        where: { id: 'e-1' },
        data: { userId: null },
      });
    });

    it('Conflict 409 quando employee não tem userId vinculado', async () => {
      prismaMock.employee.findUniqueOrThrow.mockResolvedValue({
        id: 'e-1',
        condominiumId: 'condo-1',
        userId: null,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);

      await expect(employeeService.revokeAccess('e-1', admin)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(prismaMock.condominiumUser.updateMany).not.toHaveBeenCalled();
    });
  });
});
