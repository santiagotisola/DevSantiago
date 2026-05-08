import type { Charge, ChargeStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import type { Page, PrismaTx } from "../types";

export interface ChargeFilters {
  unitId?: string;
  status?: ChargeStatus;
  referenceMonth?: string;
  page?: number;
  limit?: number;
}

/**
 * Charge com `unit.identifier`/`unit.block` + category — shape
 * usado por listagens financeiras hoje. Migrar para tipo dedicado
 * (não Prisma generated) reduz acoplamento mas exige mapping —
 * deixar para sprint futura.
 */
export type ChargeWithMeta = Charge & {
  unit: { identifier: string; block: string | null };
  category: { name: string } | null;
};

export interface ChargesRepository {
  findById(id: string, tx?: PrismaTx): Promise<Charge | null>;

  findByIdWithMeta(id: string, tx?: PrismaTx): Promise<ChargeWithMeta | null>;

  listByCondominium(
    condominiumId: string,
    filters: ChargeFilters,
    tx?: PrismaTx,
  ): Promise<Page<ChargeWithMeta>>;

  update(
    id: string,
    data: Prisma.ChargeUpdateInput,
    tx?: PrismaTx,
  ): Promise<Charge>;
}

export class PrismaChargesRepository implements ChargesRepository {
  private client(tx?: PrismaTx) {
    return tx ?? prisma;
  }

  async findById(id: string, tx?: PrismaTx) {
    return this.client(tx).charge.findUnique({ where: { id } });
  }

  async findByIdWithMeta(id: string, tx?: PrismaTx) {
    return this.client(tx).charge.findUnique({
      where: { id },
      include: {
        unit: { select: { identifier: true, block: true } },
        category: { select: { name: true } },
      },
    }) as Promise<ChargeWithMeta | null>;
  }

  async listByCondominium(
    condominiumId: string,
    filters: ChargeFilters,
    tx?: PrismaTx,
  ) {
    const c = this.client(tx);
    const { page = 1, limit = 20, unitId, status, referenceMonth } = filters;
    const where = {
      unit: { condominiumId },
      ...(unitId && { unitId }),
      ...(status && { status }),
      ...(referenceMonth && { referenceMonth }),
    };
    const [items, total] = await Promise.all([
      c.charge.findMany({
        where,
        include: {
          unit: { select: { identifier: true, block: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { status: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }) as Promise<ChargeWithMeta[]>,
      c.charge.count({ where: { unit: { condominiumId } } }),
    ]);
    return { items, total, page, limit };
  }

  async update(id: string, data: Prisma.ChargeUpdateInput, tx?: PrismaTx) {
    return this.client(tx).charge.update({ where: { id }, data });
  }
}

export const chargesRepository: ChargesRepository =
  new PrismaChargesRepository();
