import { Router } from 'express';
import { Request, Response } from 'express';
import { financeService } from './finance.service';
import { authenticate, authorize } from '../../middleware/auth';
import { validateRequest } from '../../utils/validateRequest';
import {
  createChargeSchema,
  updateChargeSchema,
  ratioSchema,
  paySchema,
  createTransactionSchema,
} from './finance.validation';

const router = Router();
router.use(authenticate);
router.use(authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'COUNCIL_MEMBER', 'SUPER_ADMIN', 'RESIDENT'));


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
  const { paidAmount, paidAt } = validateRequest(paySchema, req.body);
  const charge = await financeService.markAsPaid(req.params.id, paidAmount, paidAt ? new Date(paidAt) : undefined);
  res.json({ success: true, data: { charge } });
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
