/**
 * TransactionsService — sub-context do domínio financeiro.
 *
 * Responsabilidades:
 *  - listByAccount(accountId, actor, filters): listagem paginada
 *    com tenant scope.
 *  - create(input): cria transação + invalida cache de balance.
 *
 * Não-responsabilidades:
 *  - Marcar charge como paga (charges.service).
 *  - Compor balancete (reporting.service).
 *  - Sincronizar gateway (gateway/).
 *
 * Composição via orchestrator quando precisar de multi-step
 * atômico (ex: webhook outbox processor que cria transaction +
 * marca charge — orquestrado fora deste service).
 */
import { ForbiddenError } from "../../../../middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import { cacheKeys, invalidate } from "../../../../config/cache";
import {
  transactionsRepository,
  type CreateTransactionInput,
  type TransactionFilters,
  type TransactionsRepository,
} from "./transactions.repo";
import type { FinanceActor, PrismaTx } from "../types";

export class TransactionsService {
  constructor(private repo: TransactionsRepository = transactionsRepository) {}

  async listByAccount(
    accountId: string,
    actor: FinanceActor,
    filters: TransactionFilters,
  ) {
    await this.assertAccountAccess(accountId, actor);
    return this.repo.listByAccount(accountId, filters);
  }

  /**
   * Aceita `tx` opcional para composição com outros sub-services
   * em orchestrator (ex: billing.receivePayment).
   * Invalidação de cache acontece SEMPRE, mesmo em tx — race
   * entre commit e leitura é window pequena (≤30s do TTL).
   */
  async create(
    input: CreateTransactionInput,
    options: { tx?: PrismaTx } = {},
  ) {
    const transaction = await this.repo.create(input, options.tx);
    // Invalida cache do balance da account afetada.
    await invalidate(cacheKeys.accountBalance(input.accountId)).catch(() => {
      // Cache failure não deve falhar transação.
    });
    return transaction;
  }

  /**
   * Tenant scope check via account → condominium.
   * Em P5+ extrair para shared/auth-helpers.
   */
  private async assertAccountAccess(accountId: string, actor: FinanceActor) {
    const account = await prisma.financialAccount.findUnique({
      where: { id: accountId },
      select: { condominiumId: true },
    });
    if (!account) {
      throw new ForbiddenError("Conta não encontrada");
    }
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        condominiumId: account.condominiumId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError("Acesso negado a esta conta");
    }
  }
}

export const transactionsService = new TransactionsService();
