import { Prisma, StockMovementType, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ForbiddenError,
} from "../../middleware/errorHandler";

type StockActor = { userId: string; role: string };

export type StockCategory =
  | "limpeza"
  | "manutenção"
  | "segurança"
  | "escritório"
  | "outro";

export interface CreateStockItemDTO {
  condominiumId: string;
  name: string;
  description?: string;
  category: StockCategory;
  unit: string;
  quantity?: number;
  minQuantity?: number;
  location?: string;
}

export type UpdateStockItemDTO = Partial<
  Omit<CreateStockItemDTO, "condominiumId" | "quantity">
>;

export interface CreateMovementDTO {
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string;
}

export class StockService {
  async ensureItemAccess(itemId: string, actor: StockActor) {
    const item = await prisma.stockItem.findUniqueOrThrow({
      where: { id: itemId },
      select: {
        id: true,
        condominiumId: true,
        quantity: true,
        minQuantity: true,
      },
    });

    if (actor.role === UserRole.SUPER_ADMIN) return item;

    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        condominiumId: item.condominiumId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("Acesso negado a este item de estoque");
    }
    return item;
  }

  async listByCondominium(
    condominiumId: string,
    options: { category?: string; lowStock?: boolean } = {},
  ) {
    const allItems = await prisma.stockItem.findMany({
      where: {
        condominiumId,
        ...(options.category ? { category: options.category } : {}),
      },
      include: {
        movements: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { name: "asc" },
    });
    return options.lowStock
      ? allItems.filter((i) => i.quantity <= i.minQuantity)
      : allItems;
  }

  async createItem(data: CreateStockItemDTO) {
    return prisma.stockItem.create({ data });
  }

  async updateItem(id: string, data: UpdateStockItemDTO, actor: StockActor) {
    await this.ensureItemAccess(id, actor);
    return prisma.stockItem.update({ where: { id }, data });
  }

  async deleteItem(id: string, actor: StockActor) {
    await this.ensureItemAccess(id, actor);
    await prisma.stockItem.delete({ where: { id } });
  }

  // Movimentações — usa increment/decrement no DB para evitar lost-update.
  // CHECK constraint (quantity >= 0) vira P2010/P2034 → BadRequestError.
  async registerMovement(
    itemId: string,
    data: CreateMovementDTO,
    actor: StockActor,
  ) {
    await this.ensureItemAccess(itemId, actor);

    try {
      return await prisma.$transaction(async (tx) => {
        let updated;
        if (data.type === "IN") {
          updated = await tx.stockItem.update({
            where: { id: itemId },
            data: { quantity: { increment: data.quantity } },
          });
        } else if (data.type === "OUT") {
          updated = await tx.stockItem.update({
            where: { id: itemId },
            data: { quantity: { decrement: data.quantity } },
          });
        } else {
          updated = await tx.stockItem.update({
            where: { id: itemId },
            data: { quantity: data.quantity },
          });
        }

        const movement = await tx.stockMovement.create({
          data: {
            itemId,
            type: data.type as StockMovementType,
            quantity: data.quantity,
            reason: data.reason,
            performedBy: actor.userId,
          },
        });

        return { movement, item: updated };
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      const isCheckViolation =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (code === "P2010" || code === "P2034");
      const isNumericRange =
        err instanceof Prisma.PrismaClientKnownRequestError && code === "P2003";
      const msg = String((err as Error).message ?? "");
      if (
        isCheckViolation ||
        isNumericRange ||
        msg.includes("stock_quantity_nonneg") ||
        msg.includes("violates check constraint")
      ) {
        throw new BadRequestError("Quantidade insuficiente em estoque");
      }
      throw err;
    }
  }

  async listMovements(itemId: string, actor: StockActor) {
    await this.ensureItemAccess(itemId, actor);
    return prisma.stockMovement.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

export const stockService = new StockService();
