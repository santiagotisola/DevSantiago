/**
 * ChargesService — sub-context do domínio financeiro.
 *
 * Responsabilidades:
 *  - list(condominiumId, filters): listagem paginada.
 *  - getById(chargeId): detail.
 *  - markAsPaid: muda status + invalidação cache.
 *  - cancel: muda status + invalidação cache.
 *
 * Nota: ratios e syncWithGateway permanecem na facade temporariamente
 * até sprint 3.5 — exigem reorganização de gateway/ e composição
 * com transactions (orchestrator). Migração progressiva.
 */
import { ForbiddenError, AppError } from "../../../../middleware/errorHandler";
import { UserRole, ChargeStatus } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import { cacheKeys, invalidate } from "../../../../config/cache";
import {
  chargesRepository,
  type ChargeFilters,
  type ChargesRepository,
} from "./charges.repo";
import type { FinanceActor, PrismaTx } from "../types";

export class ChargesService {
  constructor(private repo: ChargesRepository = chargesRepository) {}

  async list(condominiumId: string, filters: ChargeFilters) {
    return this.repo.listByCondominium(condominiumId, filters);
  }

  async getById(chargeId: string) {
    return this.repo.findByIdWithMeta(chargeId);
  }

  /**
   * Marca charge como PAID. Retorna a charge atualizada.
   *
   * Aceita `tx` opcional para composição em orchestrator
   * (webhook outbox processor já faz isto manualmente; quando
   * billing.service for criado, será o callsite oficial).
   *
   * Invalida cache do balance da account associada.
   */
  async markAsPaid(
    chargeId: string,
    paidAmount: number,
    options: { tx?: PrismaTx; paidAt?: Date } = {},
  ) {
    const charge = await this.repo.findById(chargeId, options.tx);
    if (!charge) throw new AppError("Cobrança não encontrada", 404);
    if (charge.status === "PAID") {
      // Idempotente — retorna sem mudar.
      return charge;
    }

    const updated = await this.repo.update(
      chargeId,
      {
        status: "PAID",
        paidAt: options.paidAt ?? new Date(),
        paidAmount,
      },
      options.tx,
    );

    await invalidate(cacheKeys.accountBalance(charge.accountId)).catch(() => {});
    return updated;
  }

  async cancel(chargeId: string, actor: FinanceActor) {
    const charge = await this.repo.findById(chargeId);
    if (!charge) throw new AppError("Cobrança não encontrada", 404);

    // Tenant scope via account → condominium.
    const account = await prisma.financialAccount.findUnique({
      where: { id: charge.accountId },
      select: { condominiumId: true },
    });
    if (!account) throw new AppError("Conta não encontrada", 404);
    await this.assertTenantAccess(actor, account.condominiumId);

    if (charge.status === "PAID") {
      throw new AppError("Cobrança paga não pode ser cancelada", 400);
    }
    if (charge.status === ChargeStatus.CANCELED) {
      return charge;
    }

    const updated = await this.repo.update(chargeId, {
      status: ChargeStatus.CANCELED,
    });
    await invalidate(cacheKeys.accountBalance(charge.accountId)).catch(() => {});
    return updated;
  }

  private async assertTenantAccess(actor: FinanceActor, condominiumId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: actor.userId, condominiumId, isActive: true },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError("Acesso negado a este condomínio");
    }
  }
}

export const chargesService = new ChargesService();
