import { prisma } from "../../config/prisma";
import {
  ChargeStatus,
  FinancialTransactionType,
  GatewayType,
  UserRole,
} from "@prisma/client";
import {
  AppError,
  ForbiddenError,
  ValidationError,
} from "../../middleware/errorHandler";
import { toNumber, roundMoney } from "../../utils/decimal";
import { GatewayFactory } from "../../services/gateway";
import { logger } from "../../config/logger";
import {
  decrypt,
  decryptJson,
  encrypt,
  encryptJson,
} from "../../utils/cryptoVault";

/**
 * Lê o gatewayKey decifrando se houver versão Enc, senão fallback
 * para o plaintext legado durante a fase EXPAND da migração.
 * Após CONTRACT, a coluna plaintext desaparece.
 */
function readGatewayKey(account: {
  gatewayKey: string | null;
  gatewayKeyEnc: string | null;
}): string | null {
  if (account.gatewayKeyEnc) {
    try {
      return decrypt(account.gatewayKeyEnc);
    } catch (err) {
      logger.error("Falha ao decifrar gatewayKeyEnc — usando fallback", err);
    }
  }
  return account.gatewayKey;
}

function readGatewayConfig(account: {
  gatewayConfig: unknown;
  gatewayConfigEnc: string | null;
}): unknown {
  if (account.gatewayConfigEnc) {
    try {
      return decryptJson(account.gatewayConfigEnc);
    } catch (err) {
      logger.error("Falha ao decifrar gatewayConfigEnc — fallback", err);
    }
  }
  return account.gatewayConfig;
}
import { subMonths, startOfMonth, format } from "date-fns";
import { NotificationService } from "../../notifications/notification.service";

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
  method: "equal" | "fraction"; // rateio igual ou por fração ideal
}

type FinanceActor = { userId: string; role: UserRole };

export class FinanceService {
  // ─── Guard de acesso ────────────────────────────────────────
  private async ensureChargeAccess(chargeId: string, actor: FinanceActor) {
    const charge = await prisma.charge.findUniqueOrThrow({
      where: { id: chargeId },
      include: { unit: { select: { condominiumId: true } } },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: charge.unit.condominiumId,
          isActive: true,
        },
      });
      if (!membership)
        throw new ForbiddenError("Acesso negado a esta cobrança");
    }
    return charge;
  }

  // ─── Contas ──────────────────────────────────────────────────
  async listAccounts(condominiumId: string) {
    return prisma.financialAccount.findMany({
      where: { condominiumId, isActive: true },
      include: {
        _count: { select: { transactions: true, charges: true } },
      },
    });
  }

  async getAccountBalance(accountId: string, actor: FinanceActor) {
    const account = await prisma.financialAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: account.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta conta");
    }

    const [income, expense] = await prisma.$transaction([
      prisma.financialTransaction.aggregate({
        where: {
          accountId,
          type: FinancialTransactionType.INCOME,
          paidAt: { not: null },
        },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: {
          accountId,
          type: FinancialTransactionType.EXPENSE,
          paidAt: { not: null },
        },
        _sum: { amount: true },
      }),
    ]);

    const balance =
      toNumber(income._sum.amount) - toNumber(expense._sum.amount);
    return {
      account,
      balance,
      totalIncome: toNumber(income._sum.amount),
      totalExpense: toNumber(expense._sum.amount),
    };
  }

  // ─── Cobranças ───────────────────────────────────────────────
  async listCharges(
    condominiumId: string,
    filters: {
      unitId?: string;
      status?: ChargeStatus;
      referenceMonth?: string;
      page?: number;
      limit?: number;
    },
  ) {
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
        orderBy: [{ dueDate: "asc" }, { status: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.charge.count({ where: { unit: { condominiumId } } }),
    ]);

    return {
      charges,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCharge(data: CreateChargeDTO, createdBy: string) {
    const account = await prisma.financialAccount.findUniqueOrThrow({
      where: { id: data.accountId },
      select: { condominiumId: true },
    });
    const unit = await prisma.unit.findFirst({
      where: { id: data.unitId, condominiumId: account.condominiumId },
    });
    if (!unit) {
      throw new ValidationError("Unidade inválida", {
        unitId: ["Unidade não pertence ao condomínio desta conta"],
      });
    }
    const charge = await prisma.charge.create({
      data: { ...(data as any), createdBy, status: ChargeStatus.PENDING },
      include: { unit: { select: { identifier: true, block: true } } },
    });

    const unitUsers = await prisma.condominiumUser.findMany({
      where: { unitId: data.unitId },
      select: { userId: true },
    });

    await Promise.all(
      unitUsers.map((u) =>
        NotificationService.enqueue({
          userId: u.userId,
          type: "FINANCIAL",
          title: "Nova cobrança gerada",
          message: `Uma nova cobrança no valor de R$ ${Number(data.amount).toFixed(2)} foi gerada com vencimento em ${format(new Date(data.dueDate), "dd/MM/yyyy")}.`,
          data: {
            chargeId: charge.id,
            amount: data.amount,
            dueDate: data.dueDate,
          },
          channels: ["inapp", "email"],
        }),
      ),
    );

    return charge;
  }

  async updateCharge(
    chargeId: string,
    actor: FinanceActor,
    data: Partial<CreateChargeDTO>,
  ) {
    await this.ensureChargeAccess(chargeId, actor);
    return prisma.charge.update({
      where: { id: chargeId },
      data: data as any,
    });
  }

  async ratioCharges(data: RatioChargesDTO, createdBy: string) {
    const units = await prisma.unit.findMany({
      where: { condominiumId: data.condominiumId, status: "OCCUPIED" },
    });

    if (units.length === 0)
      throw new AppError("Nenhuma unidade ocupada encontrada");

    const totalFraction = units.reduce(
      (sum: number, u: any) => sum + u.fraction.toNumber(),
      0,
    );

    const chargesData = units.map((unit: any) => {
      const amount =
        data.method === "fraction"
          ? (data.totalAmount * unit.fraction.toNumber()) / totalFraction
          : data.totalAmount / units.length;

      return {
        unitId: unit.id,
        accountId: data.accountId,
        categoryId: data.categoryId,
        description: data.description,
        amount: roundMoney(amount),
        dueDate: data.dueDate,
        referenceMonth: data.referenceMonth,
        status: ChargeStatus.PENDING,
        createdBy,
      };
    });

    // Usamos transaction individual para poder capturar IDs e sincronizar
    const createdCharges = await prisma.$transaction(
      chargesData.map((c: any) =>
        prisma.charge.create({ data: c, select: { id: true } }),
      ),
    );

    // Sincronização assíncrona
    Promise.all(
      createdCharges.map((c: { id: string }) =>
        this.syncChargeWithGateway(c.id),
      ),
    ).catch((e) =>
      logger.error("Erro na sincronização em lote de cobranças:", e),
    );

    return { count: createdCharges.length, totalAmount: data.totalAmount };
  }

  // ─── Integração com Gateway ──────────────────────────────────
  async syncChargeWithGateway(chargeId: string) {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        account: true,
      },
    });

    const apiKey = readGatewayKey(charge?.account ?? { gatewayKey: null, gatewayKeyEnc: null });
    if (!charge || !apiKey || charge.gatewayId) return;

    const gateway = GatewayFactory.getService(charge.account.gatewayType);
    if (!gateway) return;

    try {
      const response = await gateway.createPayment(charge, {
        apiKey,
        config: readGatewayConfig(charge.account),
      });

      return prisma.charge.update({
        where: { id: charge.id },
        data: {
          gatewayId: response.gatewayId,
          gatewayStatus: response.gatewayStatus,
          paymentLink: response.paymentLink,
          pixQrCode: response.pixQrCode,
          pixCopyPaste: response.pixCopyPaste,
          boletoUrl: response.boletoUrl,
          boletoCode: response.boletoCode,
        },
      });
    } catch (error) {
      logger.error(
        `Erro ao sincronizar cobrança ${chargeId} com gateway:`,
        error,
      );
    }
  }

  async getChargeById(chargeId: string) {
    return prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        unit: {
          select: { identifier: true, block: true, condominiumId: true },
        },
        category: { select: { name: true } },
      },
    });
  }

  async forceSyncWithGateway(chargeId: string) {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: { account: true },
    });
    if (!charge) throw new AppError("Cobrança não encontrada", 404);
    if (charge.status !== "PENDING")
      throw new AppError("Apenas cobranças pendentes podem ser sincronizadas");
    const apiKey = readGatewayKey(charge.account);
    if (!apiKey)
      throw new AppError("Conta financeira não possui gateway configurado");

    const gateway = GatewayFactory.getService(charge.account.gatewayType);
    if (!gateway) throw new AppError("Gateway não suportado");

    const response = await gateway.createPayment(charge, {
      apiKey,
      config: readGatewayConfig(charge.account),
    });
    return prisma.charge.update({
      where: { id: chargeId },
      data: {
        gatewayId: response.gatewayId,
        gatewayStatus: response.gatewayStatus,
        paymentLink: response.paymentLink,
        pixQrCode: response.pixQrCode,
        pixCopyPaste: response.pixCopyPaste,
        boletoUrl: response.boletoUrl,
        boletoCode: response.boletoCode,
      },
    });
  }

  async configureGateway(
    accountId: string,
    config: { gatewayType: string; gatewayKey: string; gatewayConfig?: any },
  ) {
    // Dual-write: durante EXPAND, escrevemos a versão cifrada
    // (Enc) E zeramos o plaintext legado para reduzir janela de
    // exposição. Quem ainda precisar ler durante a transição usa
    // readGatewayKey() que faz fallback transparente.
    return prisma.financialAccount.update({
      where: { id: accountId },
      data: {
        gatewayType: config.gatewayType as GatewayType,
        gatewayKey: null,
        gatewayKeyEnc: encrypt(config.gatewayKey),
        gatewayConfig: undefined,
        gatewayConfigEnc: config.gatewayConfig
          ? encryptJson(config.gatewayConfig)
          : null,
      },
      select: { id: true, name: true, gatewayType: true },
    });
  }

  async markAsPaid(
    chargeId: string,
    actor: FinanceActor,
    paidAmount: number,
    paidAt?: Date,
  ) {
    await this.ensureChargeAccess(chargeId, actor);
    return prisma.charge.update({
      where: { id: chargeId },
      data: {
        status: ChargeStatus.PAID,
        paidAmount,
        paidAt: paidAt || new Date(),
      },
    });
  }

  async cancelCharge(chargeId: string, actor: FinanceActor) {
    await this.ensureChargeAccess(chargeId, actor);
    return prisma.charge.update({
      where: { id: chargeId },
      data: { status: ChargeStatus.CANCELED },
    });
  }

  // ─── Transações ──────────────────────────────────────────────
  async listTransactions(
    accountId: string,
    actor: FinanceActor,
    filters: {
      type?: FinancialTransactionType;
      referenceMonth?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const account = await prisma.financialAccount.findUniqueOrThrow({
      where: { id: accountId },
      select: { condominiumId: true },
    });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: account.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta conta");
    }
    const { page = 1, limit = 20, ...where } = filters;

    const [transactions, total] = await prisma.$transaction([
      prisma.financialTransaction.findMany({
        where: {
          accountId,
          ...(where.type && { type: where.type }),
          ...(where.referenceMonth && { referenceMonth: where.referenceMonth }),
        },
        include: { category: { select: { name: true } } },
        orderBy: { dueDate: "desc" },
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
    // Antes: Promise.all sobre 12 meses, cada um com $transaction de
    // 5 aggregates = 60 round-trips ao DB. Em condomínio com 5k
    // charges, ~3-8s.
    //
    // Agora: 2 queries raw com GROUP BY referenceMonth — uma para
    // financial_transactions (income/expense) e outra para charges
    // (charged/paid/overdue). 12 buckets mensais agregados em ~5ms.
    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    const months = Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
    );

    type TxRow = {
      referenceMonth: string;
      type: "INCOME" | "EXPENSE";
      total: string | number;
    };
    type ChargeRow = {
      referenceMonth: string;
      bucket: "CHARGED" | "PAID" | "OVERDUE";
      total: string | number;
      cnt: string | number;
    };

    const [txRows, chargeRows] = await Promise.all([
      prisma.$queryRaw<TxRow[]>`
        SELECT
          ft."referenceMonth"  AS "referenceMonth",
          ft."type"            AS "type",
          COALESCE(SUM(ft."amount"), 0) AS "total"
        FROM "financial_transactions" ft
        JOIN "financial_accounts" fa ON fa."id" = ft."accountId"
        WHERE fa."condominiumId" = ${condominiumId}
          AND ft."referenceMonth" BETWEEN ${startMonth} AND ${endMonth}
          AND ft."paidAt" IS NOT NULL
        GROUP BY ft."referenceMonth", ft."type"
      `,
      prisma.$queryRaw<ChargeRow[]>`
        SELECT
          c."referenceMonth" AS "referenceMonth",
          'CHARGED'::text    AS "bucket",
          COALESCE(SUM(c."amount"), 0) AS "total",
          COUNT(*) AS "cnt"
        FROM "charges" c
        JOIN "units" u ON u."id" = c."unitId"
        WHERE u."condominiumId" = ${condominiumId}
          AND c."referenceMonth" BETWEEN ${startMonth} AND ${endMonth}
        GROUP BY c."referenceMonth"
        UNION ALL
        SELECT
          c."referenceMonth" AS "referenceMonth",
          'PAID'::text       AS "bucket",
          COALESCE(SUM(c."paidAmount"), 0) AS "total",
          COUNT(*) AS "cnt"
        FROM "charges" c
        JOIN "units" u ON u."id" = c."unitId"
        WHERE u."condominiumId" = ${condominiumId}
          AND c."referenceMonth" BETWEEN ${startMonth} AND ${endMonth}
          AND c."status" = 'PAID'
        GROUP BY c."referenceMonth"
        UNION ALL
        SELECT
          c."referenceMonth" AS "referenceMonth",
          'OVERDUE'::text    AS "bucket",
          0::numeric         AS "total",
          COUNT(*)           AS "cnt"
        FROM "charges" c
        JOIN "units" u ON u."id" = c."unitId"
        WHERE u."condominiumId" = ${condominiumId}
          AND c."referenceMonth" BETWEEN ${startMonth} AND ${endMonth}
          AND c."status" = 'OVERDUE'
        GROUP BY c."referenceMonth"
      `,
    ]);

    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();
    for (const r of txRows) {
      const v = Number(r.total);
      if (r.type === "INCOME") incomeByMonth.set(r.referenceMonth, v);
      else expenseByMonth.set(r.referenceMonth, v);
    }

    const chargedByMonth = new Map<string, number>();
    const paidByMonth = new Map<string, number>();
    const overdueCountByMonth = new Map<string, number>();
    for (const r of chargeRows) {
      const total = Number(r.total);
      const cnt = Number(r.cnt);
      if (r.bucket === "CHARGED") chargedByMonth.set(r.referenceMonth, total);
      else if (r.bucket === "PAID") paidByMonth.set(r.referenceMonth, total);
      else if (r.bucket === "OVERDUE")
        overdueCountByMonth.set(r.referenceMonth, cnt);
    }

    return months.map((month) => {
      const income = incomeByMonth.get(month) ?? 0;
      const expense = expenseByMonth.get(month) ?? 0;
      return {
        month,
        income,
        expense,
        charged: chargedByMonth.get(month) ?? 0,
        paid: paidByMonth.get(month) ?? 0,
        overdueCount: overdueCountByMonth.get(month) ?? 0,
        balance: income - expense,
      };
    });
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
      orderBy: { dueDate: "asc" },
    });
  }

  async getChargesByUnit(unitId: string, actor: FinanceActor) {
    const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
    if (actor.role !== UserRole.SUPER_ADMIN) {
      const membership = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          condominiumId: unit.condominiumId,
          isActive: true,
        },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }
    const [pending, total] = await prisma.$transaction([
      prisma.charge.findMany({
        where: { unitId, status: { in: ["PENDING", "OVERDUE"] } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.charge.aggregate({ where: { unitId }, _sum: { amount: true } }),
    ]);
    return { pending, total: toNumber(total._sum.amount) };
  }

  async getFinancialForecast(condominiumId: string) {
    const now = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(now), 6);

    // 1. Média de despesas dos últimos 6 meses
    const expenses = await prisma.financialTransaction.findMany({
      where: {
        account: { condominiumId },
        type: "EXPENSE",
        paidAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, paidAt: true },
    });

    const monthlyExpenses: Record<string, number> = {};
    expenses.forEach((e: { amount: any; paidAt: Date | null }) => {
      const month = format(e.paidAt!, "yyyy-MM");
      monthlyExpenses[month] =
        (monthlyExpenses[month] || 0) + toNumber(e.amount);
    });

    const expenseValues = Object.values(monthlyExpenses);
    const averageExpense =
      expenseValues.length > 0
        ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
        : 0;

    // 2. Receita esperada (baseado no total de unidades e taxa média)
    // Aqui usamos o total de unidades ocupadas para prever o próximo rateio
    const unitCount = await prisma.unit.count({
      where: { condominiumId, status: "OCCUPIED" },
    });

    // Pegamos o valor total do último rateio como base
    const lastCharge = await prisma.charge.findFirst({
      where: { unit: { condominiumId } },
      orderBy: { createdAt: "desc" },
      select: { amount: true },
    });

    const baseAmountPerUnit = lastCharge ? toNumber(lastCharge.amount) : 0;
    const expectedRevenue = unitCount * baseAmountPerUnit;

    return {
      averageExpense: roundMoney(averageExpense),
      expectedRevenue: roundMoney(expectedRevenue),
      suggestedReserve: roundMoney(expectedRevenue * 0.1), // 10% de margEM
      forecastBalance: roundMoney(expectedRevenue - averageExpense),
      safetyMargin:
        averageExpense > 0
          ? ((expectedRevenue - averageExpense) / averageExpense) * 100
          : 100,
    };
  }

  // ─── Rateio Parcelado ─────────────────────────────────────────
  async ratioChargesInstallments(
    data: Omit<RatioChargesDTO, "dueDate" | "referenceMonth"> & {
      firstDueDate: Date;
      installments: number;
      intervalDays: number;
    },
    createdBy: string,
  ) {
    const results: {
      installment: number;
      dueDate: Date;
      count: number;
      totalAmount: number;
    }[] = [];
    for (let i = 0; i < data.installments; i++) {
      const dueDate = new Date(data.firstDueDate);
      dueDate.setDate(dueDate.getDate() + i * data.intervalDays);
      const referenceMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;
      const description = `${data.description} (${i + 1}/${data.installments})`;
      const result = await this.ratioCharges(
        { ...data, description, dueDate, referenceMonth },
        createdBy,
      );
      results.push({ installment: i + 1, dueDate, ...result });
    }
    return {
      installments: data.installments,
      totalCharges: results.reduce((s, r) => s + r.count, 0),
      results,
    };
  }

  // ─── Cobranças Parceladas (unidade única) ─────────────────────
  async createChargeInstallments(
    data: Omit<CreateChargeDTO, "dueDate"> & {
      firstDueDate: Date;
      installments: number;
      intervalDays: number;
    },
    createdBy: string,
  ) {
    const charges: any[] = [];
    for (let i = 0; i < data.installments; i++) {
      const dueDate = new Date(data.firstDueDate);
      dueDate.setDate(dueDate.getDate() + i * data.intervalDays);
      const referenceMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;
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
  async previewRatio(
    condominiumId: string,
    totalAmount: number,
    method: "equal" | "fraction",
  ) {
    const units = await prisma.unit.findMany({
      where: { condominiumId, status: "OCCUPIED" },
      select: { id: true, identifier: true, block: true, fraction: true },
    });
    const totalFraction = units.reduce((s, u) => s + Number(u.fraction), 0);
    return units.map((u) => ({
      unitId: u.id,
      identifier: u.identifier,
      block: u.block,
      amount:
        method === "fraction"
          ? Math.round(
              ((totalAmount * Number(u.fraction)) / totalFraction) * 100,
            ) / 100
          : Math.round((totalAmount / units.length) * 100) / 100,
    }));
  }
}

export const financeService = new FinanceService();
