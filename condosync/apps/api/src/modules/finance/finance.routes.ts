import { Router } from "express";
import { Request, Response } from "express";
import { z } from "zod";
import { financeService } from "./finance.service";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import {
  createChargeSchema,
  updateChargeSchema,
  ratioSchema,
  paySchema,
  createTransactionSchema,
  ratioInstallmentsSchema,
  chargeInstallmentsSchema,
} from "./finance.validation";

const router = Router();
router.use(authenticate);
router.use(
  authorize(
    "CONDOMINIUM_ADMIN",
    "SYNDIC",
    "COUNCIL_MEMBER",
    "SUPER_ADMIN",
    "RESIDENT",
  ),
);

// ─── Contas
router.get("/accounts/:condominiumId", async (req: Request, res: Response) => {
  const accounts = await financeService.listAccounts(req.params.condominiumId);
  res.json({ success: true, data: { accounts } });
});

router.get(
  "/accounts/:accountId/balance",
  async (req: Request, res: Response) => {
    const data = await financeService.getAccountBalance(req.params.accountId, req.user!);
    res.json({ success: true, data });
  },
);

// Cobranças
router.get("/charges/:condominiumId", async (req: Request, res: Response) => {
  const data = await financeService.listCharges(req.params.condominiumId, {
    unitId: req.query.unitId as string,
    referenceMonth: req.query.referenceMonth as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data });
});

router.post(
  "/charges",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createChargeSchema, req.body);
    const charge = await financeService.createCharge(
      { ...data, dueDate: new Date(data.dueDate) },
      req.user!.userId,
    );
    res.status(201).json({ success: true, data: { charge } });
  },
);

router.patch(
  "/charges/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateChargeSchema, req.body);
    const charge = await financeService.updateCharge(req.params.id, req.user!, {
      ...data,
      ...(data.dueDate && { dueDate: new Date(data.dueDate) as any }),
    });
    res.json({ success: true, data: { charge } });
  },
);

router.post(
  "/charges/ratio",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(ratioSchema, req.body);
    const result = await financeService.ratioCharges(
      { ...data, dueDate: new Date(data.dueDate) },
      req.user!.userId,
    );
    res.json({ success: true, data: result });
  },
);

router.patch(
  "/charges/:id/pay",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const { paidAmount, paidAt } = validateRequest(paySchema, req.body);
    const charge = await financeService.markAsPaid(
      req.params.id,
      req.user!,
      paidAmount,
      paidAt ? new Date(paidAt) : undefined,
    );
    res.json({ success: true, data: { charge } });
  },
);

router.post(
  "/charges/ratio/installments",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(ratioInstallmentsSchema, req.body);
    const result = await financeService.ratioChargesInstallments(
      { ...data, firstDueDate: new Date(data.firstDueDate) },
      req.user!.userId,
    );
    res.json({ success: true, data: result });
  },
);

router.post(
  "/charges/installments",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(chargeInstallmentsSchema, req.body);
    const result = await financeService.createChargeInstallments(
      { ...data, firstDueDate: new Date(data.firstDueDate) },
      req.user!.userId,
    );
    res.status(201).json({ success: true, data: result });
  },
);

router.get(
  "/charges/ratio/preview",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const { condominiumId, totalAmount, method } = req.query as {
      condominiumId: string;
      totalAmount: string;
      method: string;
    };
    const preview = await financeService.previewRatio(
      condominiumId,
      parseFloat(totalAmount),
      (method as "equal" | "fraction") || "equal",
    );
    res.json({ success: true, data: { preview } });
  },
);

router.delete(
  "/charges/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const charge = await financeService.cancelCharge(req.params.id, req.user!);
    res.json({ success: true, data: { charge } });
  },
);

router.get("/charges/unit/:unitId", async (req: Request, res: Response) => {
  const data = await financeService.getChargesByUnit(
    req.params.unitId,
    req.user!,
  );
  res.json({ success: true, data });
});

router.get(
  "/defaulters/:condominiumId",
  async (req: Request, res: Response) => {
    const defaulters = await financeService.getDefaulters(
      req.params.condominiumId,
    );
    res.json({ success: true, data: { defaulters } });
  },
);

// Transações
router.get("/transactions/:accountId", async (req: Request, res: Response) => {
  const data = await financeService.listTransactions(req.params.accountId, req.user!, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data });
});

router.post(
  "/transactions",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createTransactionSchema, req.body);
    const transaction = await financeService.createTransaction(
      {
        ...data,
        dueDate: new Date(data.dueDate),
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      },
      req.user!.userId,
    );
    res.status(201).json({ success: true, data: { transaction } });
  },
);

// Cobrança individual (com campos de pagamento)
router.get("/charges/:id/detail", async (req: Request, res: Response) => {
  const charge = await financeService.getChargeById(req.params.id);
  if (!charge)
    return res
      .status(404)
      .json({ success: false, message: "Cobrança não encontrada" });
  res.json({ success: true, data: { charge } });
});

// Sincronização manual com gateway
router.post(
  "/charges/:id/sync",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const charge = await financeService.forceSyncWithGateway(req.params.id);
    res.json({ success: true, data: { charge } });
  },
);

// Configurar gateway na conta financeira
router.patch(
  "/accounts/:accountId/gateway",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const gatewaySchema = z.object({
      gatewayType: z.enum(["ASAAS", "PJBANK"]),
      gatewayKey: z.string().min(1),
      gatewayConfig: z.record(z.unknown()).optional(),
    });
    const { gatewayType, gatewayKey, gatewayConfig } = validateRequest(gatewaySchema, req.body);
    const account = await financeService.configureGateway(
      req.params.accountId,
      { gatewayType, gatewayKey, gatewayConfig },
    );
    res.json({ success: true, data: { account } });
  },
);

// Relatórios
router.get(
  "/balance/:condominiumId/yearly/:year",
  async (req: Request, res: Response) => {
    const data = await financeService.getMonthlyBalance(
      req.params.condominiumId,
      Number(req.params.year),
    );
    res.json({ success: true, data });
  },
);

router.get(
  "/forecast/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = await financeService.getFinancialForecast(
      req.params.condominiumId,
    );
    res.json({ success: true, data });
  },
);

export default router;
