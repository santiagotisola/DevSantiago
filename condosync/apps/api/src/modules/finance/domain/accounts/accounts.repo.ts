/**
 * AccountsRepository — única importação de Prisma neste sub-context.
 *
 * Service NÃO importa Prisma diretamente; usa esta interface.
 * Em testes, mockar a interface é trivial (vitest-mock-extended)
 * sem precisar mock de Prisma client inteiro.
 */
import type { FinancialAccount } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import type { PrismaTx } from "../types";

export interface AccountsRepository {
  findById(
    id: string,
    tx?: PrismaTx,
  ): Promise<FinancialAccount | null>;

  findByIdWithCondominium(
    id: string,
    tx?: PrismaTx,
  ): Promise<{ id: string; condominiumId: string } | null>;

  listByCondominium(
    condominiumId: string,
    tx?: PrismaTx,
  ): Promise<FinancialAccount[]>;

  /**
   * Aggregates de income/expense para getBalance. Caller decide
   * se cacheia (service hoje cacheia 30s).
   */
  aggregateIncomeExpense(
    accountId: string,
    tx?: PrismaTx,
  ): Promise<{ income: number; expense: number }>;
}

export class PrismaAccountsRepository implements AccountsRepository {
  private client(tx?: PrismaTx) {
    return tx ?? prisma;
  }

  async findById(id: string, tx?: PrismaTx) {
    return this.client(tx).financialAccount.findUnique({ where: { id } });
  }

  async findByIdWithCondominium(id: string, tx?: PrismaTx) {
    return this.client(tx).financialAccount.findUnique({
      where: { id },
      select: { id: true, condominiumId: true },
    });
  }

  async listByCondominium(condominiumId: string, tx?: PrismaTx) {
    return this.client(tx).financialAccount.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async aggregateIncomeExpense(accountId: string, tx?: PrismaTx) {
    const c = this.client(tx);
    const [income, expense] = await Promise.all([
      c.financialTransaction.aggregate({
        where: { accountId, type: "INCOME", paidAt: { not: null } },
        _sum: { amount: true },
      }),
      c.financialTransaction.aggregate({
        where: { accountId, type: "EXPENSE", paidAt: { not: null } },
        _sum: { amount: true },
      }),
    ]);
    return {
      income: Number(income._sum.amount ?? 0),
      expense: Number(expense._sum.amount ?? 0),
    };
  }
}

// Singleton padrão da plataforma — services injetam OU recebem
// instância em construtor (em P5+ quando DI container chegar).
export const accountsRepository: AccountsRepository =
  new PrismaAccountsRepository();
