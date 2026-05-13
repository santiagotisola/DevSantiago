import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../middleware/errorHandler";

type VehicleActor = { userId: string; role: string };

export function normalizePlate(plate: string): string {
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export interface CreateVehicleDTO {
  unitId: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year?: number;
  type?: "CAR" | "MOTORCYCLE" | "TRUCK" | "BICYCLE" | "OTHER";
}

export type UpdateVehicleDTO = Partial<CreateVehicleDTO>;

export interface CreateAccessLogDTO {
  plate: string;
  vehicleId?: string;
  unitId?: string;
  isResident?: boolean;
  notes?: string;
}

export class VehicleService {
  async listByUnit(unitId: string, actor: VehicleActor) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { condominiumId: true },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: unit.condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a esta unidade");
    }
    return prisma.vehicle.findMany({
      where: { unitId, isActive: true },
    });
  }

  private async ensureResidentOwnsUnit(unitId: string, actor: VehicleActor) {
    if (actor.role !== UserRole.RESIDENT) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você só pode cadastrar veículos na sua unidade.",
      );
    }
  }

  private async ensureResidentOwnsVehicleUnit(
    vehicleId: string,
    actor: VehicleActor,
    action: "editar" | "remover",
  ) {
    if (actor.role !== UserRole.RESIDENT) return;
    const existing = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { unitId: true },
    });
    if (!existing) {
      throw new ForbiddenError(
        `Proibido: você não tem permissão para ${action} este veículo.`,
      );
    }
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, unitId: existing.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        `Proibido: você não tem permissão para ${action} este veículo.`,
      );
    }
  }

  async create(data: CreateVehicleDTO, actor: VehicleActor) {
    await this.ensureResidentOwnsUnit(data.unitId, actor);
    return prisma.vehicle.create({ data });
  }

  async update(id: string, data: UpdateVehicleDTO, actor: VehicleActor) {
    await this.ensureResidentOwnsVehicleUnit(id, actor, "editar");
    return prisma.vehicle.update({ where: { id }, data });
  }

  async softDelete(id: string, actor: VehicleActor) {
    await this.ensureResidentOwnsVehicleUnit(id, actor, "remover");
    await prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listAccessLogs(condominiumId: string) {
    const unitIds = (
      await prisma.unit.findMany({
        where: { condominiumId },
        select: { id: true },
      })
    ).map((u) => u.id);

    return prisma.vehicleAccessLog.findMany({
      where: {
        // N2 — terceira cláusula removida: vazava logs de outros condomínios
        OR: [
          { vehicle: { unit: { condominiumId } } },
          { vehicleId: null, unitId: { in: unitIds } },
        ],
      },
      include: {
        vehicle: {
          include: { unit: { select: { identifier: true, block: true } } },
        },
      },
      orderBy: { entryAt: "desc" },
      take: 50,
    });
  }

  async createAccessLog(data: CreateAccessLogDTO, registeredBy: string) {
    let vehicleId = data.vehicleId;
    let unitId = data.unitId;
    if (!vehicleId) {
      const existing = await prisma.vehicle.findFirst({
        where: { plate: normalizePlate(data.plate), isActive: true },
      });
      if (existing) {
        vehicleId = existing.id;
        unitId = unitId ?? existing.unitId;
      }
    }
    return prisma.vehicleAccessLog.create({
      data: { ...data, vehicleId, unitId, registeredBy },
    });
  }

  // N3 — IDOR fix: verifica tenant do log antes de registrar saída
  async setAccessLogExit(id: string, actor: VehicleActor) {
    const existing = await prisma.vehicleAccessLog.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        vehicle: { select: { unit: { select: { condominiumId: true } } } },
        unitId: true,
      },
    });

    let condominiumId: string | null =
      existing.vehicle?.unit?.condominiumId ?? null;
    if (!condominiumId && existing.unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: existing.unitId },
        select: { condominiumId: true },
      });
      condominiumId = unit?.condominiumId ?? null;
    }

    if (condominiumId && actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a este log");
    }

    return prisma.vehicleAccessLog.update({
      where: { id },
      data: { exitAt: new Date() },
    });
  }
}

export const vehicleService = new VehicleService();
