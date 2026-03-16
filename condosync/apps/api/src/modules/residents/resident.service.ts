import { UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ValidationError } from '../../middleware/errorHandler';

export class ResidentService {
  assertResidentRoleRequiresUnit(role: UserRole | string, unitId?: string | null) {
    if (role === UserRole.RESIDENT && !unitId) {
      throw new ValidationError('Dados invalidos', {
        unitId: ['Morador deve estar vinculado a uma unidade.'],
      });
    }
  }

  async assertResidentUnitBelongsToCondominium(condominiumId: string, unitId: string) {
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        condominiumId,
      },
      select: { id: true },
    });

    if (!unit) {
      throw new ValidationError('Dados invalidos', {
        unitId: ['A unidade informada nao pertence a este condominio.'],
      });
    }
  }
}

export const residentService = new ResidentService();
