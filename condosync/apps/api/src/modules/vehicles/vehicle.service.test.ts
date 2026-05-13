import { describe, expect, it, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { vehicleService, normalizePlate } from './vehicle.service';
import { ForbiddenError } from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const resident = { userId: 'res-1', role: UserRole.RESIDENT };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };
const doorman = { userId: 'dm-1', role: UserRole.DOORMAN };

describe('normalizePlate', () => {
  it('remove caracteres não-alfanuméricos e maiúsculas', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23');
  });
  it('preserva placa já normalizada', () => {
    expect(normalizePlate('ABC1D23')).toBe('ABC1D23');
  });
});

describe('VehicleService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.unit.findUniqueOrThrow.mockReset();
    prismaMock.unit.findUnique.mockReset();
    prismaMock.unit.findMany.mockReset();
    prismaMock.vehicle.findMany.mockReset();
    prismaMock.vehicle.findUnique.mockReset();
    prismaMock.vehicle.findFirst.mockReset();
    prismaMock.vehicle.create.mockReset();
    prismaMock.vehicle.update.mockReset();
    prismaMock.vehicleAccessLog.findUniqueOrThrow.mockReset();
    prismaMock.vehicleAccessLog.findMany.mockReset();
    prismaMock.vehicleAccessLog.create.mockReset();
    prismaMock.vehicleAccessLog.update.mockReset();
  });

  describe('listByUnit', () => {
    it('SUPER_ADMIN lista sem membership check', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.vehicle.findMany.mockResolvedValue([] as any);
      await vehicleService.listByUnit('unit-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('admin com membership do condomínio da unit lista', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.vehicle.findMany.mockResolvedValue([{ id: 'v-1' }] as any);
      const result = await vehicleService.listByUnit('unit-1', admin);
      expect(result).toHaveLength(1);
    });

    it('fail-closed: 403 sem membership', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-x',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(vehicleService.listByUnit('unit-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('create — RESIDENT só na própria unidade', () => {
    const data = {
      unitId: 'unit-1',
      plate: 'ABC1D23',
      brand: 'Fiat',
      model: 'Uno',
      color: 'Branco',
    };

    it('RESIDENT com membership da unitId cria', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.vehicle.create.mockResolvedValue({ id: 'v-new' } as any);
      const result = await vehicleService.create(data, resident);
      expect(result.id).toBe('v-new');
    });

    it('RESIDENT sem membership da unitId recebe 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(vehicleService.create(data, resident)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.vehicle.create).not.toHaveBeenCalled();
    });

    it('ADMIN cria sem checagem por unidade', async () => {
      prismaMock.vehicle.create.mockResolvedValue({ id: 'v-new' } as any);
      await vehicleService.create(data, admin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('update — RESIDENT só na própria unidade', () => {
    it('RESIDENT com membership da unit do veículo atualiza', async () => {
      prismaMock.vehicle.findUnique.mockResolvedValue({ unitId: 'unit-1' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.vehicle.update.mockResolvedValue({ id: 'v-1', color: 'Preto' } as any);
      const result = await vehicleService.update('v-1', { color: 'Preto' }, resident);
      expect(result.color).toBe('Preto');
    });

    it('RESIDENT recebe 403 quando veículo não existe', async () => {
      prismaMock.vehicle.findUnique.mockResolvedValue(null);
      await expect(
        vehicleService.update('v-x', { color: 'Preto' }, resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('RESIDENT recebe 403 quando veículo está em outra unit', async () => {
      prismaMock.vehicle.findUnique.mockResolvedValue({ unitId: 'unit-other' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        vehicleService.update('v-1', { color: 'Preto' }, resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    });

    it('ADMIN atualiza sem checagem', async () => {
      prismaMock.vehicle.update.mockResolvedValue({ id: 'v-1' } as any);
      await vehicleService.update('v-1', { color: 'Verde' }, admin);
      expect(prismaMock.vehicle.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('marca isActive=false', async () => {
      prismaMock.vehicle.update.mockResolvedValue({} as any);
      await vehicleService.softDelete('v-1', admin);
      expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'v-1' },
        data: { isActive: false },
      });
    });

    it('mensagem de erro usa verbo "remover" para RESIDENT', async () => {
      prismaMock.vehicle.findUnique.mockResolvedValue(null);
      await expect(vehicleService.softDelete('v-x', resident)).rejects.toThrow(
        /remover este veículo/,
      );
    });
  });

  describe('listAccessLogs — N2 tenant isolation', () => {
    it('filtra por OR de (vehicle.unit.condominiumId) e (vehicleId null + unitId in)', async () => {
      prismaMock.unit.findMany.mockResolvedValue([
        { id: 'u-1' },
        { id: 'u-2' },
      ] as any);
      prismaMock.vehicleAccessLog.findMany.mockResolvedValue([] as any);
      await vehicleService.listAccessLogs('condo-1');
      const callArg: any = prismaMock.vehicleAccessLog.findMany.mock.calls[0]![0];
      expect(callArg.where.OR).toEqual([
        { vehicle: { unit: { condominiumId: 'condo-1' } } },
        { vehicleId: null, unitId: { in: ['u-1', 'u-2'] } },
      ]);
      expect(callArg.take).toBe(50);
    });
  });

  describe('createAccessLog — auto-link por placa', () => {
    it('quando vehicleId ausente, busca veículo pela placa normalizada', async () => {
      prismaMock.vehicle.findFirst.mockResolvedValue({
        id: 'v-found',
        unitId: 'u-found',
      } as any);
      prismaMock.vehicleAccessLog.create.mockResolvedValue({ id: 'log-1' } as any);
      await vehicleService.createAccessLog(
        { plate: 'abc-1d23', isResident: true },
        doorman.userId,
      );
      expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith({
        where: { plate: 'ABC1D23', isActive: true },
      });
      const callArg: any = prismaMock.vehicleAccessLog.create.mock.calls[0]![0];
      expect(callArg.data.vehicleId).toBe('v-found');
      expect(callArg.data.unitId).toBe('u-found');
      expect(callArg.data.registeredBy).toBe('dm-1');
    });

    it('quando vehicleId já fornecido, não consulta veículo', async () => {
      prismaMock.vehicleAccessLog.create.mockResolvedValue({} as any);
      await vehicleService.createAccessLog(
        { plate: 'ABC1D23', vehicleId: 'v-given', unitId: 'u-given' },
        doorman.userId,
      );
      expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    });

    it('preserva unitId explícito mesmo quando veículo encontrado tem outro unitId', async () => {
      prismaMock.vehicle.findFirst.mockResolvedValue({
        id: 'v-found',
        unitId: 'u-from-vehicle',
      } as any);
      prismaMock.vehicleAccessLog.create.mockResolvedValue({} as any);
      await vehicleService.createAccessLog(
        { plate: 'ABC1D23', unitId: 'u-explicit' },
        doorman.userId,
      );
      const callArg: any = prismaMock.vehicleAccessLog.create.mock.calls[0]![0];
      expect(callArg.data.unitId).toBe('u-explicit');
    });
  });

  describe('setAccessLogExit — N3 IDOR fix', () => {
    it('SUPER_ADMIN registra saída sem checar membership', async () => {
      prismaMock.vehicleAccessLog.findUniqueOrThrow.mockResolvedValue({
        id: 'log-1',
        vehicle: { unit: { condominiumId: 'condo-1' } },
        unitId: null,
      } as any);
      prismaMock.vehicleAccessLog.update.mockResolvedValue({ id: 'log-1' } as any);
      await vehicleService.setAccessLogExit('log-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('admin com membership do condomínio do log registra saída', async () => {
      prismaMock.vehicleAccessLog.findUniqueOrThrow.mockResolvedValue({
        id: 'log-1',
        vehicle: { unit: { condominiumId: 'condo-1' } },
        unitId: null,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.vehicleAccessLog.update.mockResolvedValue({ id: 'log-1' } as any);
      await vehicleService.setAccessLogExit('log-1', admin);
      expect(prismaMock.vehicleAccessLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({ exitAt: expect.any(Date) }),
      });
    });

    it('fail-closed: 403 quando admin não pertence ao condomínio do log', async () => {
      prismaMock.vehicleAccessLog.findUniqueOrThrow.mockResolvedValue({
        id: 'log-1',
        vehicle: { unit: { condominiumId: 'condo-other' } },
        unitId: null,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(vehicleService.setAccessLogExit('log-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.vehicleAccessLog.update).not.toHaveBeenCalled();
    });

    it('fallback: resolve condominiumId via unitId quando vehicle null', async () => {
      prismaMock.vehicleAccessLog.findUniqueOrThrow.mockResolvedValue({
        id: 'log-1',
        vehicle: null,
        unitId: 'unit-1',
      } as any);
      prismaMock.unit.findUnique.mockResolvedValue({ condominiumId: 'condo-2' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.vehicleAccessLog.update.mockResolvedValue({} as any);
      await vehicleService.setAccessLogExit('log-1', admin);
      expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
        where: { userId: 'admin-1', condominiumId: 'condo-2', isActive: true },
        select: { id: true },
      });
    });
  });
});
