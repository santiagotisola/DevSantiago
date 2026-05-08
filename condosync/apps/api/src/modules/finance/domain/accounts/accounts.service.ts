/**
 * AccountsService — sub-context do domínio financeiro.
 *
 * Responsabilidades:
 *  - getBalance(accountId, actor) — com cache 30s + tenant scope.
 *  - listByCondominium(condominiumId, actor) — listagem.
 *
 * Não-responsabilidades (ficam em outros sub-services):
 *  - Criar transações (transactions.service).
 *  - Marcar charge como paga (charges.service).
 *  - Compor balancete (reporting.service).
 */
import { ForbiddenError } from "../../../../middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import { cacheKeys, getOrCompute } from "../../../../config/cache";
import {
  accountsRepository,
  type AccountsRepository,
} from "./accounts.repo";
import type { FinanceActor } from "../types";

export class AccountsService {
  constructor(private repo: AccountsRepository = accountsRepository) {}

  async getBalance(accountId: string, actor: FinanceActor) {
    const account = await this.repo.findById(accountId);
    if (!account) {
      throw new ForbiddenError("Conta não encontrada");
    }
    await this.assertTenantAccess(actor, account.condominiumId);

    // Cache 30s + single-flight (helper em config/cache.ts).
    // Invalidação write-through em transactions.service /
    // webhook.processor.
    const aggregates = await getOrCompute(
      cacheKeys.accountBalance(accountId),
      30,
      async () => this.repo.aggregateIncomeExpense(accountId),
    );

    return {
      account,
      balance: aggregates.income - aggregates.expense,
      totalIncome: aggregates.income,
      totalExpense: aggregates.expense,
    };
  }

  async listByCondominium(condominiumId: string, actor: FinanceActor) {
    await this.assertTenantAccess(actor, condominiumId);
    return this.repo.listByCondominium(condominiumId);
  }

  /**
   * Tenant scope check — usado por todas as operações.
   * Em P5+ extrair para shared/auth-helpers se reusado em outros
   * sub-services.
   */
  private async assertTenantAccess(
    actor: FinanceActor,
    condominiumId: string,
  ) {
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

export const accountsService = new AccountsService();
