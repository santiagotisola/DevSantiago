import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler";

type CommonAreaActor = { userId: string; role: UserRole };

export interface CreateAreaDTO {
  condominiumId: string;
  name: string;
  description?: string;
  capacity?: number;
  rules?: string;
  requiresApproval?: boolean;
  maxDaysAdvance?: number;
  openTime?: string;
  closeTime?: string;
}

export type UpdateAreaDTO = Partial<
  Omit<CreateAreaDTO, "condominiumId"> & { isAvailable?: boolean }
>;

export interface CreateReservationDTO {
  commonAreaId: string;
  unitId: string;
  title?: string;
  startDate: Date;
  endDate: Date;
  guestCount?: number;
  notes?: string;
}

export class CommonAreaService {
  // ─── Guards ───────────────────────────────────────────────────
  private async ensureCondominiumAccess(condominiumId: string, actor: CommonAreaActor) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a este condomínio");
  }

  private async ensureAreaAccess(areaId: string, actor: CommonAreaActor) {
    const area = await prisma.commonArea.findUniqueOrThrow({
      where: { id: areaId },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumAccess(area.condominiumId, actor);
    return area;
  }

  async ensureUnitAccess(unitId: string, actor: CommonAreaActor) {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
      select: { id: true, condominiumId: true },
    });
    if (actor.role === UserRole.SUPER_ADMIN) return unit;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId: unit.condominiumId, isActive: true },
      select: { role: true, unitId: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    if (membership.role === UserRole.RESIDENT && membership.unitId !== unit.id) {
      throw new ForbiddenError("Morador só pode acessar a própria unidade");
    }
    return unit;
  }

  async ensureReservationAccess(
    reservationId: string,
    actor: CommonAreaActor,
    options?: { managementOnly?: boolean; residentOwnOnly?: boolean },
  ) {
    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      select: {
        id: true,
        requestedBy: true,
        unitId: true,
        status: true,
        commonArea: { select: { condominiumId: true } },
      },
    });
    if (actor.role === UserRole.SUPER_ADMIN) return reservation;
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        condominiumId: reservation.commonArea.condominiumId,
        isActive: true,
      },
      select: { role: true, unitId: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a esta reserva");
    const isManagement =
      membership.role === UserRole.CONDOMINIUM_ADMIN ||
      membership.role === UserRole.SYNDIC;
    if (options?.managementOnly && !isManagement) {
      throw new ForbiddenError("Apenas a administração pode executar esta ação");
    }
    if (
      options?.residentOwnOnly &&
      membership.role === UserRole.RESIDENT &&
      (membership.unitId !== reservation.unitId ||
        reservation.requestedBy !== actor.userId)
    ) {
      throw new ForbiddenError("Morador só pode acessar a própria reserva");
    }
    return reservation;
  }

  // ─── Áreas ────────────────────────────────────────────────────
  async listAreas(condominiumId: string, actor: CommonAreaActor) {
    await this.ensureCondominiumAccess(condominiumId, actor);
    return prisma.commonArea.findMany({
      where: { condominiumId, isActive: true },
      include: { _count: { select: { reservations: true } } },
    });
  }

  async createArea(data: CreateAreaDTO, actor: CommonAreaActor) {
    await this.ensureCondominiumAccess(data.condominiumId, actor);
    return prisma.commonArea.create({ data });
  }

  async updateArea(id: string, data: UpdateAreaDTO, actor: CommonAreaActor) {
    await this.ensureAreaAccess(id, actor);
    return prisma.commonArea.update({ where: { id }, data });
  }

  async deleteArea(id: string, actor: CommonAreaActor) {
    await this.ensureAreaAccess(id, actor);
    return prisma.commonArea.update({ where: { id }, data: { isActive: false } });
  }

  async listAreaReservations(
    areaId: string,
    actor: CommonAreaActor,
    startDate?: string,
    endDate?: string,
  ) {
    await this.ensureAreaAccess(areaId, actor);
    return prisma.reservation.findMany({
      where: {
        commonAreaId: areaId,
        status: { in: ["PENDING", "CONFIRMED"] },
        ...(startDate &&
          endDate && {
            startDate: { gte: new Date(startDate) },
            endDate: { lte: new Date(endDate) },
          }),
      },
      orderBy: { startDate: "asc" },
    });
  }

  // ─── Reservas ─────────────────────────────────────────────────
  async createReservation(
    data: CreateReservationDTO,
    requestedBy: string,
    actor: CommonAreaActor,
  ) {
    const unit = await this.ensureUnitAccess(data.unitId, actor);

    const area = await prisma.commonArea.findUniqueOrThrow({
      where: { id: data.commonAreaId },
    });

    if (area.condominiumId !== unit.condominiumId) {
      throw new ForbiddenError(
        "A unidade informada não pertence ao mesmo condomínio da área",
      );
    }

    // Valida antecedência máxima
    if (area.maxDaysAdvance) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + area.maxDaysAdvance);
      if (data.startDate > maxDate) {
        throw new ValidationError("Antecedência excedida", {
          startDate: [
            `Reserva não pode ser feita com mais de ${area.maxDaysAdvance} dias de antecedência`,
          ],
        });
      }
    }

    // Valida horário de funcionamento
    if (area.openTime && area.closeTime) {
      const [openH, openM] = (area.openTime as string).split(":").map(Number);
      const [closeH, closeM] = (area.closeTime as string).split(":").map(Number);
      const startMinutes = data.startDate.getHours() * 60 + data.startDate.getMinutes();
      const endMinutes = data.endDate.getHours() * 60 + data.endDate.getMinutes();
      if (
        startMinutes < openH * 60 + openM ||
        endMinutes > closeH * 60 + closeM
      ) {
        throw new ValidationError("Horário inválido", {
          startDate: [
            `Reserva fora do horário de funcionamento (${area.openTime} – ${area.closeTime})`,
          ],
        });
      }
    }

    // Verifica conflito de horário
    const conflict = await prisma.reservation.findFirst({
      where: {
        commonAreaId: data.commonAreaId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        ],
      },
    });
    if (conflict) {
      throw new AppError("Área já reservada neste período", 409, "CONFLICT");
    }

    return prisma.reservation.create({
      data: {
        ...data,
        requestedBy,
        status: area.requiresApproval ? "PENDING" : "CONFIRMED",
      },
    });
  }

  async approveReservation(id: string, approvedBy: string, actor: CommonAreaActor) {
    const reservation = await this.ensureReservationAccess(id, actor, {
      managementOnly: true,
    });
    if (reservation.status === "CANCELED") {
      throw new ValidationError("Transição inválida", {
        status: ["Não é possível aprovar uma reserva cancelada"],
      });
    }
    return prisma.reservation.update({
      where: { id },
      data: { status: "CONFIRMED", approvedBy },
    });
  }

  async cancelReservation(id: string, canceledBy: string, actor: CommonAreaActor, reason?: string) {
    await this.ensureReservationAccess(id, actor, { residentOwnOnly: true });
    return prisma.reservation.update({
      where: { id },
      data: { status: "CANCELED", canceledBy, cancelReason: reason },
    });
  }

  async listReservationsByUnit(unitId: string, actor: CommonAreaActor) {
    await this.ensureUnitAccess(unitId, actor);
    return prisma.reservation.findMany({
      where: { unitId },
      include: { commonArea: { select: { name: true } } },
      orderBy: { startDate: "desc" },
    });
  }

  async listReservationsByCondominium(condominiumId: string, actor: CommonAreaActor) {
    await this.ensureCondominiumAccess(condominiumId, actor);
    return prisma.reservation.findMany({
      where: { commonArea: { condominiumId } },
      include: { commonArea: { select: { name: true } } },
      orderBy: { startDate: "desc" },
      take: 50,
    });
  }
}

export const commonAreaService = new CommonAreaService();
