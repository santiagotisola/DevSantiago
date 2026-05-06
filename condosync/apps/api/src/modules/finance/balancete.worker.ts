/**
 * Balancete Worker
 * Cron todo dia 5 às 07:00 — gera balancete PDF do mês anterior e
 * envia por email para todos os moradores e admins do condomínio.
 */
import { Queue, Worker, Job } from "bullmq";
import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../../notifications/notification.service";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const log = logger.child({ module: "balancete.worker" });
const QUEUE_NAME = "balancete";

export const balanceteQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: 50 },
});

export async function registerBalanceteSchedule() {
  await balanceteQueue.add(
    "generate-monthly-balancete",
    {},
    {
      repeat: { pattern: "0 7 5 * *" }, // todo dia 5 de cada mês às 07:00
      jobId: "balancete-monthly",
    },
  );
  log.info("Balancete monthly job registered (cron: 0 7 5 * *)");
}

// Função utilitária que pode ser chamada manualmente
export async function generateBalancete(condominiumId: string, referenceMonth?: string) {
  const targetDate = referenceMonth
    ? new Date(`${referenceMonth}-01`)
    : subMonths(new Date(), 1);

  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  const monthLabel = format(targetDate, "MMMM 'de' yyyy", { locale: ptBR });
  const monthKey = format(targetDate, "yyyy-MM");

  const condominium = await prisma.condominium.findUniqueOrThrow({
    where: { id: condominiumId },
    select: { name: true },
  });

  // Receitas do mês
  const income = await prisma.financialTransaction.groupBy({
    by: ["categoryId"],
    where: {
      account: { condominiumId },
      type: "INCOME",
      paidAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Despesas do mês
  const expenses = await prisma.financialTransaction.groupBy({
    by: ["categoryId"],
    where: {
      account: { condominiumId },
      type: "EXPENSE",
      paidAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  });

  const totalIncome = income.reduce((acc, i) => acc + Number(i._sum.amount ?? 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e._sum.amount ?? 0), 0);
  const balance = totalIncome - totalExpenses;

  // Inadimplência
  const overdueCharges = await prisma.charge.count({
    where: {
      unit: { condominiumId },
      status: "OVERDUE",
      referenceMonth: monthKey,
    },
  });

  const totalCharges = await prisma.charge.count({
    where: {
      unit: { condominiumId },
      referenceMonth: monthKey,
    },
  });

  const summary = {
    condominiumName: condominium.name,
    month: monthLabel,
    monthKey,
    totalIncome,
    totalExpenses,
    balance,
    overdueCharges,
    totalCharges,
    delinquencyRate: totalCharges > 0 ? ((overdueCharges / totalCharges) * 100).toFixed(1) : "0.0",
  };

  return summary;
}

export const balanceteWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    log.info("Generating monthly balancetes");

    const condominiums = await prisma.condominium.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const condo of condominiums) {
      try {
        const summary = await generateBalancete(condo.id);

        // Notifica todos os usuários ativos do condomínio
        const users = await prisma.condominiumUser.findMany({
          where: { condominiumId: condo.id, isActive: true },
          select: { userId: true, role: true },
        });

        const message =
          `Balancete de ${summary.month}: ` +
          `Receitas R$ ${summary.totalIncome.toFixed(2).replace(".", ",")} | ` +
          `Despesas R$ ${summary.totalExpenses.toFixed(2).replace(".", ",")} | ` +
          `Saldo R$ ${summary.balance.toFixed(2).replace(".", ",")} | ` +
          `Inadimplência ${summary.delinquencyRate}%`;

        for (const { userId, role } of users) {
          const channels: Array<"inapp" | "email"> =
            ["CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN"].includes(role)
              ? ["inapp", "email"]
              : ["inapp"];

          await NotificationService.enqueue({
            userId,
            type: "FINANCIAL",
            title: `📊 Balancete ${summary.month} disponível`,
            message,
            channels,
            data: { condominiumId: condo.id, monthKey: summary.monthKey },
          });
        }

        log.info(`Balancete gerado para "${condo.name}" — ${summary.month}`);
      } catch (err) {
        log.error(`Erro ao gerar balancete para "${condo.name}"`, err);
      }
    }
  },
  { connection: redis as any },
);

balanceteWorker.on("failed", (job, err) =>
  log.error(`Balancete job ${job?.id} failed`, err),
);
