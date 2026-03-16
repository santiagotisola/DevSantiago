import { Router } from 'express';
import { Request, Response } from 'express';
import { financeService } from './finance.service';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { prisma } from '../../config/prisma';
import { z } from 'zod';
import {
  createChargeSchema,
  updateChargeSchema,
  ratioSchema,
  paySchema,
  createTransactionSchema,
  ratioInstallmentsSchema,
  chargeInstallmentsSchema,
} from './finance.validation';

const router = Router();
router.use(authenticate);
router.use(authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'));

// ─── Contas
router.get('/accounts/:condominiumId', async (req: Request, res: Response) => {
  const accounts = await financeService.listAccounts(req.params.condominiumId);
  res.json({ success: true, data: { accounts } });
});

router.get('/accounts/:accountId/balance', async (req: Request, res: Response) => {
  const data = await financeService.getAccountBalance(req.params.accountId);
  res.json({ success: true, data });
});

// Cobranças
router.get('/charges/:condominiumId', async (req: Request, res: Response) => {
  const data = await financeService.listCharges(req.params.condominiumId, {
    unitId: req.query.unitId as string,
    referenceMonth: req.query.referenceMonth as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data });
});

router.post('/charges', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(createChargeSchema, req.body);
  const charge = await financeService.createCharge({ ...data, dueDate: new Date(data.dueDate) }, req.user!.userId);
  res.status(201).json({ success: true, data: { charge } });
});

router.patch('/charges/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(updateChargeSchema, req.body);
  const charge = await financeService.updateCharge(req.params.id, {
    ...data,
    ...(data.dueDate && { dueDate: new Date(data.dueDate) as any }),
  });
  res.json({ success: true, data: { charge } });
});

router.post('/charges/ratio', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(ratioSchema, req.body);
  const result = await financeService.ratioCharges({ ...data, dueDate: new Date(data.dueDate) }, req.user!.userId);
  res.json({ success: true, data: result });
});

router.patch('/charges/:id/pay', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const body = req.body && typeof req.body.paidAmount === 'number' ? req.body : { paidAmount: 0 };
  const charge = await financeService.markAsPaid(
    req.params.id,
    body.paidAmount || 0,
    body.paidAt ? new Date(body.paidAt) : undefined
  );
  res.json({ success: true, data: { charge } });
});

router.post('/charges/ratio/installments', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(ratioInstallmentsSchema, req.body);
  const result = await financeService.ratioChargesInstallments(
    { ...data, firstDueDate: new Date(data.firstDueDate) },
    req.user!.userId
  );
  res.json({ success: true, data: result });
});

router.post('/charges/installments', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(chargeInstallmentsSchema, req.body);
  const result = await financeService.createChargeInstallments(
    { ...data, firstDueDate: new Date(data.firstDueDate) },
    req.user!.userId
  );
  res.status(201).json({ success: true, data: result });
});

router.get('/charges/ratio/preview', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { condominiumId, totalAmount, method } = req.query as { condominiumId: string; totalAmount: string; method: string };
  const preview = await financeService.previewRatio(condominiumId, parseFloat(totalAmount), (method as 'equal' | 'fraction') || 'equal');
  res.json({ success: true, data: { preview } });
});

router.delete('/charges/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const charge = await financeService.cancelCharge(req.params.id);
  res.json({ success: true, data: { charge } });
});

router.get('/charges/unit/:unitId', async (req: Request, res: Response) => {
  const data = await financeService.getChargesByUnit(req.params.unitId);
  res.json({ success: true, data });
});

router.get('/defaulters/:condominiumId', async (req: Request, res: Response) => {
  const defaulters = await financeService.getDefaulters(req.params.condominiumId);
  res.json({ success: true, data: { defaulters } });
});

// Transações
router.get('/transactions/:accountId', async (req: Request, res: Response) => {
  const data = await financeService.listTransactions(req.params.accountId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data });
});

router.post('/transactions', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = validateRequest(createTransactionSchema, req.body);
  const transaction = await financeService.createTransaction(
    { ...data, dueDate: new Date(data.dueDate), paidAt: data.paidAt ? new Date(data.paidAt) : undefined },
    req.user!.userId
  );
  res.status(201).json({ success: true, data: { transaction } });
});

// Cobrança individual (com campos de pagamento)
router.get('/charges/:id/detail', async (req: Request, res: Response) => {
  const charge = await financeService.getChargeById(req.params.id);
  if (!charge) return res.status(404).json({ success: false, message: 'Cobrança não encontrada' });
  res.json({ success: true, data: { charge } });
});

// Sincronização manual com gateway
router.post('/charges/:id/sync', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const charge = await financeService.forceSyncWithGateway(req.params.id);
  res.json({ success: true, data: { charge } });
});

// Configurar gateway na conta financeira
router.patch('/accounts/:accountId/gateway', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const { gatewayType, gatewayKey, gatewayConfig } = req.body;
  const account = await financeService.configureGateway(req.params.accountId, { gatewayType, gatewayKey, gatewayConfig });
  res.json({ success: true, data: { account } });
});

// Relatórios
router.get('/balance/:condominiumId/yearly/:year', async (req: Request, res: Response) => {
  const data = await financeService.getMonthlyBalance(req.params.condominiumId, Number(req.params.year));
  res.json({ success: true, data });
});

router.get('/forecast/:condominiumId', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const data = await financeService.getFinancialForecast(req.params.condominiumId);
  res.json({ success: true, data });
});

// ─── Fundo de Reserva ─────────────────────────────────────────
router.get('/reserve-fund/:condominiumId', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'), async (req: Request, res: Response) => {
  const entries = await prisma.reserveFundEntry.findMany({
    where: { condominiumId: req.params.condominiumId },
    orderBy: { month: 'desc' },
    take: 24,
  });
  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  res.json({ success: true, data: { entries, total } });
});

router.post('/reserve-fund', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    condominiumId: z.string().uuid(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    amount: z.number().positive(),
    description: z.string().optional(),
  });
  const data = validateRequest(schema, req.body);
  const entry = await prisma.reserveFundEntry.create({ data: { ...data, createdBy: req.user!.userId } });
  res.status(201).json({ success: true, data: entry });
});

// ─── Projetos Financeiros ─────────────────────────────────────
router.get('/projects/:condominiumId', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'), async (req: Request, res: Response) => {
  const projects = await prisma.financialProject.findMany({
    where: { condominiumId: req.params.condominiumId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: projects });
});

router.post('/projects', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    condominiumId: z.string().uuid(),
    name: z.string().min(2),
    description: z.string().optional(),
    budget: z.number().positive(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  });
  const data = validateRequest(schema, req.body);
  const project = await prisma.financialProject.create({
    data: {
      ...data,
      budget: data.budget,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: req.user!.userId,
    },
  });
  res.status(201).json({ success: true, data: project });
});

router.patch('/projects/:id', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    budget: z.number().positive().optional(),
    spent: z.number().min(0).optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  });
  const data = validateRequest(schema, req.body);
  const project = await prisma.financialProject.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  res.json({ success: true, data: project });
});

// ─── Balancete Mensal (detalhado) ─────────────────────────────
router.get('/balancete/:condominiumId/:year/:month', authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'), async (req: Request, res: Response) => {
  const { condominiumId, year, month } = req.params;
  const ym = `${year}-${month.padStart(2, '0')}`;

  const accounts = await prisma.financialAccount.findMany({ where: { condominiumId } });
  const accountIds = accounts.map((a) => a.id);

  const [income, expense, charges] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { accountId: { in: accountIds }, type: 'INCOME', referenceMonth: ym },
      include: { category: true },
    }),
    prisma.financialTransaction.findMany({
      where: { accountId: { in: accountIds }, type: 'EXPENSE', referenceMonth: ym },
      include: { category: true },
    }),
    prisma.charge.findMany({
      where: { condominiumId, dueDate: { gte: new Date(`${ym}-01`), lt: new Date(`${year}-${String(Number(month) + 1).padStart(2, '0')}-01`) } },
      include: { unit: true },
    }),
  ]);

  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);

  res.json({
    success: true,
    data: {
      period: ym,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      income,
      expense,
      charges: {
        total: charges.length,
        paid: charges.filter((c) => c.status === 'PAID').length,
        overdue: charges.filter((c) => c.status === 'OVERDUE').length,
        pending: charges.filter((c) => c.status === 'PENDING').length,
      },
    },
  });
});

export default router;
