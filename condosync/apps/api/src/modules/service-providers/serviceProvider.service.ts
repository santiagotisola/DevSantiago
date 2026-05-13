import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../middleware/errorHandler";

type ServiceProviderActor = { userId: string; role: string };

export interface CreateServiceProviderDTO {
  condominiumId: string;
  name: string;
  cnpj?: string;
  cpf?: string;
  serviceType: string;
  phone: string;
  email?: string;
  notes?: string;
}

export type UpdateServiceProviderDTO = Partial<CreateServiceProviderDTO>;

export class ServiceProviderService {
  private async ensureCondominiumMembership(
    condominiumId: string,
    actor: ServiceProviderActor,
  ) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
      select: { id: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condomínio");
  }

  async listByCondominium(
    condominiumId: string,
    options: { approved?: boolean } = {},
  ) {
    return prisma.serviceProvider.findMany({
      where: {
        condominiumId,
        ...(options.approved !== undefined && { isApproved: options.approved }),
      },
      orderBy: { name: "asc" },
    });
  }

  async create(data: CreateServiceProviderDTO, actor: ServiceProviderActor) {
    await this.ensureCondominiumMembership(data.condominiumId, actor);
    return prisma.serviceProvider.create({ data });
  }

  // L1 — IDOR fix
  async update(
    id: string,
    data: UpdateServiceProviderDTO,
    actor: ServiceProviderActor,
  ) {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumMembership(existing.condominiumId, actor);
    return prisma.serviceProvider.update({ where: { id }, data });
  }

  // L2 — IDOR fix
  async approve(id: string, actor: ServiceProviderActor) {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumMembership(existing.condominiumId, actor);
    return prisma.serviceProvider.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  // L3 — IDOR fix
  async delete(id: string, actor: ServiceProviderActor) {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumMembership(existing.condominiumId, actor);
    await prisma.serviceProvider.delete({ where: { id } });
  }
}

export const serviceProviderService = new ServiceProviderService();
