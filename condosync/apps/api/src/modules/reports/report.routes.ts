import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { toNumber } from "../../utils/decimal";
import { z } from "zod";
import { reportService } from "./report.service";

const router = Router();
router.use(authenticate);
router.use(
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN"),
);
// K1 — authorizeCondominium em nível de router aplicado por rota (condominiumId no params)
router.use(authorizeCondominium);

const dateRangeSchema = z.object({
  startDate: z
    .string()
    .datetime({ message: "startDate deve ser uma data ISO válida" })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: "endDate deve ser uma data ISO válida" })
    .optional(),
});

// Relatório de visitantes por período
router.get("/visitors/:condominiumId", async (req: Request, res: Response) => {
  // K2 — validar datas com Zod
  const { startDate, endDate } = dateRangeSchema.parse(req.query);
  const where = {
    unit: { condominiumId: req.params.condominiumId },
    createdAt: {
      gte: startDate ? new Date(startDate) : new Date(new Date().setDate(1)),
      lte: endDate ? new Date(endDate) : new Date(),
    },
  };

  const [visitors, total, authorized, denied] = await prisma.$transaction([
    prisma.visitor.findMany({
      where,
      include: { unit: { select: { identifier: true, block: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.visitor.count({ where }),
    prisma.visitor.count({
      where: { ...where, status: { in: ["AUTHORIZED", "INSIDE", "LEFT"] } },
    }),
    prisma.visitor.count({ where: { ...where, status: "DENIED" } }),
  ]);

  const withDuration = visitors.filter((v) => v.entryAt && v.exitAt);
  const avgDurationMs =
    withDuration.length > 0
      ? withDuration.reduce(
          (sum, v) => sum + (v.exitAt!.getTime() - v.entryAt!.getTime()),
          0,
        ) / withDuration.length
      : 0;

  const stats = { total, authorized, denied, avgDurationMs };
  res.json({ success: true, data: { visitors, stats } });
});

// Relatório financeiro
router.get("/financial/:condominiumId", async (req: Request, res: Response) => {
  const { referenceMonth } = req.query;

  const [income, expenses, charged, collected, defaulters] =
    await prisma.$transaction([
      prisma.financialTransaction.aggregate({
        where: {
          account: { condominiumId: req.params.condominiumId },
          type: "INCOME",
          ...(referenceMonth && { referenceMonth: referenceMonth as string }),
          paidAt: { not: null },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.financialTransaction.aggregate({
        where: {
          account: { condominiumId: req.params.condominiumId },
          type: "EXPENSE",
          ...(referenceMonth && { referenceMonth: referenceMonth as string }),
          paidAt: { not: null },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.charge.aggregate({
        where: {
          unit: { condominiumId: req.params.condominiumId },
          ...(referenceMonth && { referenceMonth: referenceMonth as string }),
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.charge.aggregate({
        where: {
          unit: { condominiumId: req.params.condominiumId },
          status: "PAID",
          ...(referenceMonth && { referenceMonth: referenceMonth as string }),
        },
        _sum: { paidAmount: true },
        _count: true,
      }),
      prisma.charge.count({
        where: {
          unit: { condominiumId: req.params.condominiumId },
          status: "PENDING",
          dueDate: { lt: new Date() },
        },
      }),
    ]);

  const chargedTotal = toNumber(charged._sum.amount);
  const collectedTotal = toNumber(collected._sum.paidAmount);
  const incomeTotal = toNumber(income._sum.amount);
  const expensesTotal = toNumber(expenses._sum.amount);

  const collectionRate = chargedTotal
    ? (collectedTotal / chargedTotal) * 100
    : 0;

  res.json({
    success: true,
    data: {
      income: { total: incomeTotal, count: income._count },
      expenses: { total: expensesTotal, count: expenses._count },
      charges: { total: chargedTotal, count: charged._count },
      collected: { total: collectedTotal, count: collected._count },
      defaulters,
      collectionRate: Math.round(collectionRate * 10) / 10,
      balance: incomeTotal - expensesTotal,
    },
  });
});

// Relatório de manutenção
router.get(
  "/maintenance/:condominiumId",
  async (req: Request, res: Response) => {
    const [byStatus, byPriority, byCategory, avgResolutionTime] =
      await prisma.$transaction([
        prisma.serviceOrder.groupBy({
          by: ["status"],
          where: { condominiumId: req.params.condominiumId },
          _count: true,
          orderBy: { status: "asc" },
        }),
        prisma.serviceOrder.groupBy({
          by: ["priority"],
          where: { condominiumId: req.params.condominiumId },
          _count: true,
          orderBy: { priority: "asc" },
        }),
        prisma.serviceOrder.groupBy({
          by: ["category"],
          where: { condominiumId: req.params.condominiumId },
          _count: true,
          orderBy: { category: "asc" },
        }),
        prisma.serviceOrder.findMany({
          where: {
            condominiumId: req.params.condominiumId,
            status: "COMPLETED",
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: { startedAt: true, completedAt: true },
        }),
      ]);

    const avgMs = avgResolutionTime.length
      ? avgResolutionTime.reduce(
          (sum, o) => sum + (o.completedAt!.getTime() - o.startedAt!.getTime()),
          0,
        ) / avgResolutionTime.length
      : 0;

    res.json({
      success: true,
      data: {
        byStatus,
        byPriority,
        byCategory,
        avgResolutionHours: Math.round(avgMs / 3600000),
      },
    });
  },
);

// Relatório de ocupação
router.get("/occupancy/:condominiumId", async (req: Request, res: Response) => {
  const [total, occupied, vacant, renovation] = await prisma.$transaction([
    prisma.unit.count({ where: { condominiumId: req.params.condominiumId } }),
    prisma.unit.count({
      where: { condominiumId: req.params.condominiumId, status: "OCCUPIED" },
    }),
    prisma.unit.count({
      where: { condominiumId: req.params.condominiumId, status: "VACANT" },
    }),
    prisma.unit.count({
      where: {
        condominiumId: req.params.condominiumId,
        status: "UNDER_RENOVATION",
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      occupied,
      vacant,
      renovation,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
    },
  });
});

// Download de PDF da prestação de contas
router.get(
  "/financial/:condominiumId/pdf",
  async (req: Request, res: Response) => {
    const { referenceMonth } = req.query;

    if (!referenceMonth) {
      return res
        .status(400)
        .json({ success: false, message: "Mês de referência é obrigatório" });
    }

    const pdfBuffer = await reportService.generateFinancialPdf(
      req.params.condominiumId,
      referenceMonth as string,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=prestacao-contas-${referenceMonth}.pdf`,
    );
    res.send(pdfBuffer);
  },
);

export default router;
