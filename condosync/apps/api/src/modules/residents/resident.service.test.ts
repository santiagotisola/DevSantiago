import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { residentService } from './resident.service';

describe('ResidentService', () => {
  describe('assertResidentRoleRequiresUnit', () => {
    it('should throw when resident has no unit', () => {
      expect(() =>
        residentService.assertResidentRoleRequiresUnit(UserRole.RESIDENT, undefined),
      ).toThrow('Dados invalidos');
    });

    it('should allow non-resident without unit', () => {
      expect(() =>
        residentService.assertResidentRoleRequiresUnit(UserRole.SYNDIC, undefined),
      ).not.toThrow();
    });
  });

  describe('assertResidentUnitBelongsToCondominium', () => {
    it('should allow unit from same condominium', async () => {
      prismaMock.unit.findFirst.mockResolvedValue({ id: 'unit-1' } as any);

      await expect(
        residentService.assertResidentUnitBelongsToCondominium('condo-1', 'unit-1'),
      ).resolves.toBeUndefined();

      expect(prismaMock.unit.findFirst).toHaveBeenCalledWith({
        where: { id: 'unit-1', condominiumId: 'condo-1' },
        select: { id: true },
      });
    });

    it('should throw when unit belongs to another condominium', async () => {
      prismaMock.unit.findFirst.mockResolvedValue(null);

      await expect(
        residentService.assertResidentUnitBelongsToCondominium('condo-1', 'unit-2'),
      ).rejects.toThrow('Dados invalidos');
    });
  });
});
