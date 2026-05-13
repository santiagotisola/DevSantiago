import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { commonAreaService } from './commonArea.service';
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const syndic = { userId: 'sy-1', role: UserRole.SYNDIC };
const resident = { userId: 'res-1', role: UserRole.RESIDENT };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('CommonAreaService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.commonArea.findUniqueOrThrow.mockReset();
    prismaMock.commonArea.findMany.mockReset();
    prismaMock.commonArea.create.mockReset();
    prismaMock.commonArea.update.mockReset();
    prismaMock.unit.findUniqueOrThrow.mockReset();
    prismaMock.reservation.findUniqueOrThrow.mockReset();
    prismaMock.reservation.findMany.mockReset();
    prismaMock.reservation.findFirst.mockReset();
    prismaMock.reservation.create.mockReset();
    prismaMock.reservation.update.mockReset();
  });

  describe('listAreas / createArea — multi-tenancy', () => {
    it('SUPER_ADMIN lista sem checar membership', async () => {
      prismaMock.commonArea.findMany.mockResolvedValue([] as any);
      await commonAreaService.listAreas('condo-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('fail-closed: sem membership 403', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(commonAreaService.listAreas('condo-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('createArea cria após validar acesso', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.commonArea.create.mockResolvedValue({ id: 'a-new' } as any);
      const result = await commonAreaService.createArea(
        { condominiumId: 'condo-1', name: 'Piscina' },
        admin,
      );
      expect(result.id).toBe('a-new');
    });
  });

  describe('deleteArea — soft delete', () => {
    it('marca isActive=false', async () => {
      prismaMock.commonArea.findUniqueOrThrow.mockResolvedValue({
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.commonArea.update.mockResolvedValue({ id: 'a-1', isActive: false } as any);
      await commonAreaService.deleteArea('a-1', admin);
      expect(prismaMock.commonArea.update).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { isActive: false },
      });
    });
  });

  describe('ensureUnitAccess — guard de unidade', () => {
    it('RESIDENT só acessa a própria unidade', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        id: 'unit-other',
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.RESIDENT,
        unitId: 'unit-mine',
      } as any);
      await expect(
        commonAreaService.ensureUnitAccess('unit-other', resident),
      ).rejects.toThrow('Morador só pode acessar a própria unidade');
    });

    it('RESIDENT acessa a própria unidade', async () => {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue({
        id: 'unit-mine',
        condominiumId: 'condo-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.RESIDENT,
        unitId: 'unit-mine',
      } as any);
      const result = await commonAreaService.ensureUnitAccess('unit-mine', resident);
      expect(result.id).toBe('unit-mine');
    });
  });

  describe('createReservation — regras de negócio', () => {
    const baseUnit = { id: 'unit-1', condominiumId: 'condo-1' };
    const baseArea = {
      id: 'area-1',
      condominiumId: 'condo-1',
      requiresApproval: false,
      maxDaysAdvance: null,
      openTime: null,
      closeTime: null,
    };

    function setupAccessOK(
      areaOverrides: Partial<typeof baseArea> = {},
      unit = baseUnit,
    ) {
      prismaMock.unit.findUniqueOrThrow.mockResolvedValue(unit as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.CONDOMINIUM_ADMIN,
        unitId: null,
      } as any);
      prismaMock.commonArea.findUniqueOrThrow.mockResolvedValue({
        ...baseArea,
        ...areaOverrides,
      } as any);
    }

    it('403 quando unidade pertence a outro condomínio que a área', async () => {
      setupAccessOK({}, { id: 'unit-1', condominiumId: 'condo-OTHER' });
      await expect(
        commonAreaService.createReservation(
          {
            commonAreaId: 'area-1',
            unitId: 'unit-1',
            startDate: new Date('2026-06-01T10:00:00Z'),
            endDate: new Date('2026-06-01T12:00:00Z'),
          },
          'req-1',
          admin,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('rejeita reserva com antecedência maior que maxDaysAdvance', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-13T00:00:00Z'));
      setupAccessOK({ maxDaysAdvance: 7 });
      await expect(
        commonAreaService.createReservation(
          {
            commonAreaId: 'area-1',
            unitId: 'unit-1',
            startDate: new Date('2026-06-15T10:00:00Z'),
            endDate: new Date('2026-06-15T12:00:00Z'),
          },
          'req-1',
          admin,
        ),
      ).rejects.toBeInstanceOf(ValidationError);
      vi.useRealTimers();
    });

    it('rejeita reserva fora do horário de funcionamento', async () => {
      setupAccessOK({ openTime: '08:00', closeTime: '22:00' });
      await expect(
        commonAreaService.createReservation(
          {
            commonAreaId: 'area-1',
            unitId: 'unit-1',
            startDate: new Date(2026, 5, 1, 6, 0),
            endDate: new Date(2026, 5, 1, 7, 0),
          },
          'req-1',
          admin,
        ),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejeita conflito com reserva existente (409)', async () => {
      setupAccessOK();
      prismaMock.reservation.findFirst.mockResolvedValue({ id: 'r-existing' } as any);
      await expect(
        commonAreaService.createReservation(
          {
            commonAreaId: 'area-1',
            unitId: 'unit-1',
            startDate: new Date(2026, 5, 1, 10, 0),
            endDate: new Date(2026, 5, 1, 12, 0),
          },
          'req-1',
          admin,
        ),
      ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });

    it('cria CONFIRMED quando área não requer aprovação', async () => {
      setupAccessOK({ requiresApproval: false });
      prismaMock.reservation.findFirst.mockResolvedValue(null);
      prismaMock.reservation.create.mockResolvedValue({ id: 'r-new', status: 'CONFIRMED' } as any);
      await commonAreaService.createReservation(
        {
          commonAreaId: 'area-1',
          unitId: 'unit-1',
          startDate: new Date(2026, 5, 1, 10, 0),
          endDate: new Date(2026, 5, 1, 12, 0),
        },
        'req-1',
        admin,
      );
      const callArg: any = prismaMock.reservation.create.mock.calls[0]![0];
      expect(callArg.data.status).toBe('CONFIRMED');
      expect(callArg.data.requestedBy).toBe('req-1');
    });

    it('cria PENDING quando área requer aprovação', async () => {
      setupAccessOK({ requiresApproval: true });
      prismaMock.reservation.findFirst.mockResolvedValue(null);
      prismaMock.reservation.create.mockResolvedValue({ id: 'r-new', status: 'PENDING' } as any);
      await commonAreaService.createReservation(
        {
          commonAreaId: 'area-1',
          unitId: 'unit-1',
          startDate: new Date(2026, 5, 1, 10, 0),
          endDate: new Date(2026, 5, 1, 12, 0),
        },
        'req-1',
        admin,
      );
      const callArg: any = prismaMock.reservation.create.mock.calls[0]![0];
      expect(callArg.data.status).toBe('PENDING');
    });
  });

  describe('approveReservation', () => {
    it('apenas management aprova (RESIDENT recebe 403)', async () => {
      prismaMock.reservation.findUniqueOrThrow.mockResolvedValue({
        id: 'r-1',
        requestedBy: 'res-1',
        unitId: 'unit-1',
        status: 'PENDING',
        commonArea: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.RESIDENT,
        unitId: 'unit-1',
      } as any);
      await expect(
        commonAreaService.approveReservation('r-1', 'admin-1', resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('SYNDIC aprova reserva PENDING', async () => {
      prismaMock.reservation.findUniqueOrThrow.mockResolvedValue({
        id: 'r-1',
        requestedBy: 'res-1',
        unitId: 'unit-1',
        status: 'PENDING',
        commonArea: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.SYNDIC,
        unitId: null,
      } as any);
      prismaMock.reservation.update.mockResolvedValue({ id: 'r-1', status: 'CONFIRMED' } as any);
      await commonAreaService.approveReservation('r-1', syndic.userId, syndic);
      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { status: 'CONFIRMED', approvedBy: 'sy-1' },
      });
    });

    it('rejeita aprovar reserva CANCELED', async () => {
      prismaMock.reservation.findUniqueOrThrow.mockResolvedValue({
        id: 'r-1',
        requestedBy: 'res-1',
        unitId: 'unit-1',
        status: 'CANCELED',
        commonArea: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.SYNDIC,
        unitId: null,
      } as any);
      await expect(
        commonAreaService.approveReservation('r-1', syndic.userId, syndic),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('cancelReservation — residentOwnOnly', () => {
    it('RESIDENT só cancela reserva da própria unidade quando foi o requester', async () => {
      prismaMock.reservation.findUniqueOrThrow.mockResolvedValue({
        id: 'r-1',
        requestedBy: 'res-OTHER',
        unitId: 'unit-1',
        status: 'CONFIRMED',
        commonArea: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.RESIDENT,
        unitId: 'unit-1',
      } as any);
      await expect(
        commonAreaService.cancelReservation('r-1', resident.userId, resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('RESIDENT cancela própria reserva com motivo', async () => {
      prismaMock.reservation.findUniqueOrThrow.mockResolvedValue({
        id: 'r-1',
        requestedBy: 'res-1',
        unitId: 'unit-1',
        status: 'CONFIRMED',
        commonArea: { condominiumId: 'condo-1' },
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({
        role: UserRole.RESIDENT,
        unitId: 'unit-1',
      } as any);
      prismaMock.reservation.update.mockResolvedValue({} as any);
      await commonAreaService.cancelReservation('r-1', resident.userId, resident, 'mudei de ideia');
      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { status: 'CANCELED', canceledBy: 'res-1', cancelReason: 'mudei de ideia' },
      });
    });
  });
});
