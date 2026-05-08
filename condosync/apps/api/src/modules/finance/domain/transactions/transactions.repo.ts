/**
 * TransactionsRepository — única importação de Prisma neste sub-context.
 */
import type { FinancialTransaction, FinancialTransactionType } from "@prisma/client";
import { prisma } from "../../../../config/prisma";
import type { Page, PrismaTx } from "../types";

export interface TransactionFilters {
  type?: FinancialTransactionType;
  referenceMonth?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string;
  type: FinancialTransactionType;
  amount: number;
  description: string;
  dueDate: Date;
  paidAt?: Date;
  referenceMonth?: string;
  receiptUrl?: string;
  notes?: string;
  chargeId?: string;
  createdBy: string;
}

export interface TransactionsRepository {
  listByAccount(
    accountId: string,
    filters: TransactionFilters,
    tx?: PrismaTx,
  ): Promise<Page<FinancialTransaction>>;

  create(
    data: CreateTransactionInput,
    tx?: PrismaTx,
  ): Promise<FinancialTransaction>;
}

export class PrismaTransactionsRepository implements TransactionsRepository {
  private client(tx?: PrismaTx) {
    return tx ?? prisma;
  }

  async listByAccount(
    accountId: string,
    filters: TransactionFilters,
    tx?: PrismaTx,
  ) {
    const c = this.client(tx);
    const { page = 1, limit = 20, type, referenceMonth } = filters;
    const where = {
      accountId,
      ...(type && { type }),
      ...(referenceMonth && { referenceMonth }),
    };
    const [items, total] = await Promise.all([
      c.financialTransaction.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: [{ dueDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      c.financialTransaction.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async create(data: CreateTransactionInput, tx?: PrismaTx) {
    return this.client(tx).financialTransaction.create({ data });
  }
}

export const transactionsRepository: TransactionsRepository =
  new PrismaTransactionsRepository();
