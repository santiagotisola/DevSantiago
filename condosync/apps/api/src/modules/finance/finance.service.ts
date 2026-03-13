import { prisma } from '../../config/prisma';
import { ChargeStatus, FinancialTransactionType } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

export interface CreateChargeDTO {
  unitId: string;
  accountId: string;
  categoryId?: string;
  description: string;
  amount: number;
  dueDate: Date;
  referenceMonth?: string;
  interestRate?: number;
  penaltyAmount?: number;
}

export interface CreateTransactionDTO {
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
}

export interface RatioChargesDTO {
  condominiumId: string;
  accountId: string;
  categoryId?: string;
  description: string;
  totalAmount: number;
  dueDate: Date;
  referenceMonth: string;
  method: 'equal' | 'fraction'; // rateio igual ou por fração ideal
}

export class FinanceService {
  // ─── Contas ──────────────────────────────────────────────────
  async listAccounts(condominiumId: string) {
    return prisma.financialAccount.findMany({
      where: { condominiumId, isActive: true },
      include: {
        _count: { select: { transactions: true, charges: true } },
      },
    });
  }

  async getAccountBalance(accountId: string) {
    const account = await prisma.financialAccount.findUniqueOrThrow({ where: { id: accountId } });

    const [income, expense] = await prisma.$transaction([
      prisma.financialTransaction.aggregate({
        where: { accountId, type: FinancialTransactionType.INCOME, paidAt: { not: null } },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { accountId, type: FinancialTransactionType.EXPENSE, paidAt: { not: null } },
        _sum: { amount: true },
      }),
    ]);

    const balance = (income._sum.amount || 0) - (expense._sum.amount || 0);
    return { account, balance, totalIncome: income._sum.amount || 0, totalExpense: expense._sum.amount || 0 };
  }

  // ─── Cobranças ───────────────────────────────────────────────
  async listCharges(condominiumId: string, filters: {
    unitId?: string;
    status?: ChargeStatus;
    referenceMonth?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filters;

    const [charges, total] = await prisma.$transaction([
      prisma.charge.findMany({
        where: {
          unit: { condominiumId },
          ...(where.unitId && { unitId: where.unitId }),
          ...(where.status && { status: where.status }),
          ...(where.referenceMonth && { referenceMonth: where.referenceMonth }),
        },
        include: {
          unit: { select: { identifier: true, block: true } },
          category: { select: { name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { status: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.charge.count({ where: { unit: { condominiumId } } }),
    ]);

    return { charges, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createCharge(data: CreateChargeDTO, createdBy: string) {
    return prisma.charge.create({
      data: { ...data, createdBy, status: ChargeStatus.PENDING },
      include: { unit: { select: { identifier: true, block: true } } },
    });
  }

  async updateCharge(chargeId: string, data: Partial<CreateChargeDTO>) {
    return prisma.charge.update({
      where: { id: chargeId },
      data,
    });
  }

  async ratioCharges(data: RatioChargesDTO, createdBy: string) {
    const units = await prisma.unit.findMany({
      where: { condominiumId: data.condominiumId, status: 'OCCUPIED' },
    });

    if (units.length === 0) throw new AppError('Nenhuma unidade ocupada encontrada');

    const totalFraction = units.reduce((sum, u) => sum + u.fraction, 0);

    const charges = units.map((unit) => {
      const amount =
        data.method === 'fraction'
          ? (data.totalAmount * unit.fraction) / totalFraction
          : data.totalAmount / units.length;

      return {
        unitId: unit.id,
        accountId: data.accountId,
        categoryId: data.categoryId,
        description: data.description,
        amount: Math.round(amount * 100) / 100,
        dueDate: data.dueDate,
        referenceMonth: data.referenceMonth,
        status: ChargeStatus.PENDING,
        createdBy,
      };
    });

    await prisma.charge.createMany({ data: charges });
    return { count: charges.length, totalAmount: data.totalAmount };
  }

  async markAsPaid(chargeId: string, paidAmount: number, paidAt?: Date) {
    return prisma.charge.update({
      where: { id: chargeId },
      data: { status: ChargeStatus.PAID, paidAmount, paidAt: paidAt || new Date() },
    });
  }

  async cancelCharge(chargeId: string) {
    return prisma.charge.update({
      where: { id: chargeId },
      data: { status: ChargeStatus.CANCELED },
    });
  }

  // ─── Transações ──────────────────────────────────────────────
  async listTransactions(accountId: string, filters: {
    type?: FinancialTransactionType;
    referenceMonth?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, ...where } = filters;

    const [transactions, total] = await prisma.$transaction([
      prisma.financialTransaction.findMany({
        where: {
          accountId,
          ...(where.type && { type: where.type }),
          ...(where.referenceMonth && { referenceMonth: where.referenceMonth }),
        },
        include: { category: { select: { name: true } } },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialTransaction.count({ where: { accountId } }),
    ]);

    return { transactions, total, page, limit };
  }

  async createTransaction(data: CreateTransactionDTO, createdBy: string) {
    return prisma.financialTransaction.create({ data: { ...data, createdBy } });
  }

  // ─── Relatórios ──────────────────────────────────────────────
  async getMonthlyBalance(condominiumId: string, year: number) {
    const months = Array.from({ length: 12 }, (_, i) =>
      `${year}-${String(i + 1).padStart(2, '0')}`
    );

    const result = await Promise.all(
      months.map(async (month) => {
        const accounts = await prisma.financialAccount.findMany({
          where: { condominiumId },
          select: { id: true },
        });
        const accountIds = accounts.map((a) => a.id);

        const [income, expense, charged, paid, overdue] = await prisma.$transaction([
          prisma.financialTransaction.aggregate({
            where: { accountId: { in: accountIds }, type: 'INCOME', referenceMonth: month, paidAt: { not: null } },
            _sum: { amount: true },
          }),
          prisma.financialTransaction.aggregate({
            where: { accountId: { in: accountIds }, type: 'EXPENSE', referenceMonth: month, paidAt: { not: null } },
            _sum: { amount: true },
          }),
          prisma.charge.aggregate({
            where: { unit: { condominiumId }, referenceMonth: month },
            _sum: { amount: true },
          }),
          prisma.charge.aggregate({
            where: { unit: { condominiumId }, referenceMonth: month, status: 'PAID' },
            _sum: { paidAmount: true },
          }),
          prisma.charge.count({
            where: { unit: { condominiumId }, referenceMonth: month, status: 'OVERDUE' },
          }),
        ]);

        return {
          month,
          income: income._sum.amount || 0,
          expense: expense._sum.amount || 0,
          charged: charged._sum.amount || 0,
          paid: paid._sum.paidAmount || 0,
          overdueCount: overdue,
          balance: (income._sum.amount || 0) - (expense._sum.amount || 0),
        };
      })
    );

    return result;
  }

  async getDefaulters(condominiumId: string) {
    const now = new Date();
    return prisma.charge.findMany({
      where: {
        unit: { condominiumId },
        status: ChargeStatus.PENDING,
        dueDate: { lt: now },
      },
      include: { unit: { select: { identifier: true, block: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getChargesByUnit(unitId: string) {
    const [pending, total] = await prisma.$transaction([
      prisma.charge.findMany({
        where: { unitId, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.charge.aggregate({ where: { unitId }, _sum: { amount: true } }),
    ]);
    return { pending, total: total._sum.amount || 0 };
  }

  // ─── Rateio Parcelado ─────────────────────────────────────────
  async ratioChargesInstallments(
    data: Omit<RatioChargesDTO, 'dueDate' | 'referenceMonth'> & {
      firstDueDate: Date;
      installments: number;
      intervalDays: number;
    },
    createdBy: string
  ) {
    const results: { installment: number; dueDate: Date; count: number; totalAmount: number }[] = [];
    for (let i = 0; i < data.installments; i++) {
      const dueDate = new Date(data.firstDueDate);
      dueDate.setDate(dueDate.getDate() + i * data.intervalDays);
      const referenceMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
      const description = `${data.description} (${i + 1}/${data.installments})`;
      const result = await this.ratioCharges(
        { ...data, description, dueDate, referenceMonth },
        createdBy
      );
      results.push({ installment: i + 1, dueDate, ...result });
    }
    return { installments: data.installments, totalCharges: results.reduce((s, r) => s + r.count, 0), results };
  }

  // ─── Cobranças Parceladas (unidade única) ─────────────────────
  async createChargeInstallments(
    data: Omit<CreateChargeDTO, 'dueDate'> & {
      firstDueDate: Date;
      installments: number;
      intervalDays: number;
    },
    createdBy: string
  ) {
    const charges: any[] = [];
    for (let i = 0; i < data.installments; i++) {
      const dueDate = new Date(data.firstDueDate);
      dueDate.setDate(dueDate.getDate() + i * data.intervalDays);
      const referenceMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
      charges.push({
        unitId: data.unitId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        description: `${data.description} (${i + 1}/${data.installments})`,
        amount: data.amount,
        dueDate,
        referenceMonth,
        interestRate: data.interestRate,
        penaltyAmount: data.penaltyAmount,
        status: ChargeStatus.PENDING,
        createdBy,
      });
    }
    await prisma.charge.createMany({ data: charges });
    return { installments: data.installments, count: charges.length };
  }

  // ─── Preview de rateio (sem criar) ────────────────────────────
  async previewRatio(condominiumId: string, totalAmount: number, method: 'equal' | 'fraction') {
    const units = await prisma.unit.findMany({
      where: { condominiumId, status: 'OCCUPIED' },
      select: { id: true, identifier: true, block: true, fraction: true },
    });
    const totalFraction = units.reduce((s, u) => s + u.fraction, 0);
    return units.map(u => ({
      unitId: u.id,
      identifier: u.identifier,
      block: u.block,
      amount: method === 'fraction'
        ? Math.round((totalAmount * u.fraction / totalFraction) * 100) / 100
        : Math.round((totalAmount / units.length) * 100) / 100,
    }));
  }
}

export const financeService = new FinanceService();
