import { Router } from 'express';
import { Request, Response } from 'express';
import { financeService } from './finance.service';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const router = Router();
router.use(authenticate);
router.use(authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'));

const createChargeSchema = z.object({
  unitId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  referenceMonth: z.string().optional(),
  interestRate: z.number().min(0).optional(),
  penaltyAmount: z.number().min(0).optional(),
});

const ratioSchema = z.object({
  condominiumId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3),
  totalAmount: z.number().positive(),
  dueDate: z.string().datetime(),
  referenceMonth: z.string().optional().default(''),
  method: z.enum(['equal', 'fraction']),
});

const ratioInstallmentsSchema = z.object({
  condominiumId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3),
  totalAmount: z.number().positive(),
  firstDueDate: z.string().datetime(),
  installments: z.number().int().min(2).max(60),
  intervalDays: z.number().int().min(7).max(90).default(30),
  method: z.enum(['equal', 'fraction']),
});

const chargeInstallmentsSchema = z.object({
  unitId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(3),
  amount: z.number().positive(),
  firstDueDate: z.string().datetime(),
  installments: z.number().int().min(2).max(60),
  intervalDays: z.number().int().min(7).max(90).default(30),
});

const paySchema = z.object({
  paidAmount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
});

const updateChargeSchema = createChargeSchema.partial();

const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive(),
  description: z.string().min(3),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().optional(),
  referenceMonth: z.string().optional(),
  notes: z.string().optional(),
});

// Contas
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
    ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
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

// Relatórios
router.get('/balance/:condominiumId/yearly/:year', async (req: Request, res: Response) => {
  const data = await financeService.getMonthlyBalance(req.params.condominiumId, Number(req.params.year));
  res.json({ success: true, data });
});

export default router;
