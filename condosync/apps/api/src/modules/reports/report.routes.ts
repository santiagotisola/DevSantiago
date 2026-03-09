import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN'));

// Relatório de visitantes por período
router.get('/visitors/:condominiumId', async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const visitors = await prisma.visitor.findMany({
    where: {
      unit: { condominiumId: req.params.condominiumId },
      createdAt: {
        gte: startDate ? new Date(startDate as string) : new Date(new Date().setDate(1)),
        lte: endDate ? new Date(endDate as string) : new Date(),
      },
    },
    include: { unit: { select: { identifier: true, block: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: visitors.length,
    authorized: visitors.filter((v) => v.status === 'AUTHORIZED' || v.status === 'INSIDE' || v.status === 'LEFT').length,
    denied: visitors.filter((v) => v.status === 'DENIED').length,
    avgDurationMs: visitors
      .filter((v) => v.entryAt && v.exitAt)
      .reduce((sum, v) => sum + (v.exitAt!.getTime() - v.entryAt!.getTime()), 0) / (visitors.filter((v) => v.entryAt && v.exitAt).length || 1),
  };

  res.json({ success: true, data: { visitors, stats } });
});

// Relatório financeiro
router.get('/financial/:condominiumId', async (req: Request, res: Response) => {
  const { referenceMonth } = req.query;

  const [income, expenses, charged, collected, defaulters] = await prisma.$transaction([
    prisma.financialTransaction.aggregate({
      where: {
        account: { condominiumId: req.params.condominiumId },
        type: 'INCOME',
        ...(referenceMonth && { referenceMonth: referenceMonth as string }),
        paidAt: { not: null },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.aggregate({
      where: {
        account: { condominiumId: req.params.condominiumId },
        type: 'EXPENSE',
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
        status: 'PAID',
        ...(referenceMonth && { referenceMonth: referenceMonth as string }),
      },
      _sum: { paidAmount: true },
      _count: true,
    }),
    prisma.charge.count({
      where: {
        unit: { condominiumId: req.params.condominiumId },
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    }),
  ]);

  const collectionRate = charged._sum.amount
    ? ((collected._sum.paidAmount || 0) / charged._sum.amount) * 100
    : 0;

  res.json({
    success: true,
    data: {
      income: { total: income._sum.amount || 0, count: income._count },
      expenses: { total: expenses._sum.amount || 0, count: expenses._count },
      charges: { total: charged._sum.amount || 0, count: charged._count },
      collected: { total: collected._sum.paidAmount || 0, count: collected._count },
      defaulters,
      collectionRate: Math.round(collectionRate * 10) / 10,
      balance: (income._sum.amount || 0) - (expenses._sum.amount || 0),
    },
  });
});

// Relatório de manutenção
router.get('/maintenance/:condominiumId', async (req: Request, res: Response) => {
  const [byStatus, byPriority, byCategory, avgResolutionTime] = await prisma.$transaction([
    prisma.serviceOrder.groupBy({
      by: ['status'],
      where: { condominiumId: req.params.condominiumId },
      _count: true,
    }),
    prisma.serviceOrder.groupBy({
      by: ['priority'],
      where: { condominiumId: req.params.condominiumId },
      _count: true,
    }),
    prisma.serviceOrder.groupBy({
      by: ['category'],
      where: { condominiumId: req.params.condominiumId },
      _count: true,
    }),
    prisma.serviceOrder.findMany({
      where: { condominiumId: req.params.condominiumId, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }),
  ]);

  const avgMs = avgResolutionTime.length
    ? avgResolutionTime.reduce((sum, o) => sum + (o.completedAt!.getTime() - o.startedAt!.getTime()), 0) / avgResolutionTime.length
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
});

// Relatório de ocupação
router.get('/occupancy/:condominiumId', async (req: Request, res: Response) => {
  const [total, occupied, vacant, renovation] = await prisma.$transaction([
    prisma.unit.count({ where: { condominiumId: req.params.condominiumId } }),
    prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'OCCUPIED' } }),
    prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'VACANT' } }),
    prisma.unit.count({ where: { condominiumId: req.params.condominiumId, status: 'UNDER_RENOVATION' } }),
  ]);

  res.json({
    success: true,
    data: {
      total, occupied, vacant, renovation,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
    },
  });
});

export default router;
