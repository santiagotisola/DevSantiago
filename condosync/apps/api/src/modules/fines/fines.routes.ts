import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError, AppError } from "../../middleware/errorHandler";
import { NotificationService } from "../../notifications/notification.service";

const router = Router();
router.use(authenticate);

const MGMT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"] as const;

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  unitId: z.string().uuid(),
  description: z.string().min(10),
  regulation: z.string().min(3),
  photoUrls: z.array(z.string()).default([]),
  amount: z.number().positive(),
  appealDeadlineDays: z.number().int().min(1).max(30).default(15),
});

const appealSchema = z.object({
  appealText: z.string().min(10),
});

const resolveAppealSchema = z.object({
  appealStatus: z.enum(["ACCEPTED", "REJECTED"]),
  appealResponse: z.string().min(5),
});

async function ensureMembership(userId: string, role: string, condominiumId: string) {
  if (role === "SUPER_ADMIN") return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
  });
  if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
}

// GET /fines/:condominiumId — lista multas (gestão vê todas; morador vê da sua unidade)
router.get("/:condominiumId", async (req: Request, res: Response) => {
  await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);

  const { status, unitId } = req.query;
  let filterUnitId = unitId as string | undefined;

  // Morador só vê sua própria unidade
  if (req.user!.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: req.user!.userId, condominiumId: req.params.condominiumId, isActive: true },
    });
    filterUnitId = membership?.unitId ?? undefined;
  }

  const fines = await prisma.fine.findMany({
    where: {
      condominiumId: req.params.condominiumId,
      ...(status ? { status: status as string } : {}),
      ...(filterUnitId ? { unitId: filterUnitId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: { fines } });
});

// POST /fines — síndico cria auto de infração
router.post(
  "/",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    await ensureMembership(req.user!.userId, req.user!.role, data.condominiumId);

    const appealDeadline = new Date();
    appealDeadline.setDate(appealDeadline.getDate() + (data.appealDeadlineDays ?? 15));

    const fine = await prisma.fine.create({
      data: {
        condominiumId: data.condominiumId,
        unitId: data.unitId,
        reportedBy: req.user!.userId,
        description: data.description,
        regulation: data.regulation,
        photoUrls: data.photoUrls,
        amount: data.amount,
        appealDeadline,
        status: "PENDING",
      },
    });

    // Notifica moradores da unidade
    const residents = await prisma.condominiumUser.findMany({
      where: { unitId: data.unitId, role: "RESIDENT", isActive: true },
      select: { userId: true },
    });
    for (const { userId } of residents) {
      await NotificationService.enqueue({
        userId,
        type: "FINANCIAL",
        title: "⚠️ Auto de Infração Registrado",
        message: `Um auto de infração foi registrado para sua unidade. Valor: R$ ${data.amount.toFixed(2)}. Prazo de recurso: ${data.appealDeadlineDays} dias.`,
        channels: ["inapp", "email"],
        data: { fineId: fine.id },
      });
    }

    res.status(201).json({ success: true, data: { fine } });
  },
);

// POST /fines/:id/appeal — morador envia recurso
router.post("/:id/appeal", authorize("RESIDENT", ...MGMT), async (req: Request, res: Response) => {
  const fine = await prisma.fine.findUniqueOrThrow({ where: { id: req.params.id } });

  if (fine.status !== "PENDING") throw new AppError("Esta multa não está em status de recurso", 400);
  if (new Date() > fine.appealDeadline) throw new AppError("Prazo de recurso encerrado", 400);

  // Morador só pode recorrer da sua unidade
  if (req.user!.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: req.user!.userId, unitId: fine.unitId, isActive: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado");
  }

  const { appealText } = validateRequest(appealSchema, req.body);
  const updated = await prisma.fine.update({
    where: { id: req.params.id },
    data: { appealText, appealedAt: new Date(), status: "APPEAL" },
  });

  // Notifica síndico/admin
  const admins = await prisma.condominiumUser.findMany({
    where: { condominiumId: fine.condominiumId, role: { in: ["CONDOMINIUM_ADMIN", "SYNDIC"] }, isActive: true },
    select: { userId: true },
  });
  for (const { userId } of admins) {
    await NotificationService.enqueue({
      userId,
      type: "COMMUNICATION",
      title: "📋 Recurso de Multa Recebido",
      message: `Recurso enviado para multa: "${fine.description}"`,
      channels: ["inapp"],
      data: { fineId: fine.id },
    });
  }

  res.json({ success: true, data: { fine: updated } });
});

// PATCH /fines/:id/resolve-appeal — síndico julga o recurso
router.patch(
  "/:id/resolve-appeal",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const fine = await prisma.fine.findUniqueOrThrow({ where: { id: req.params.id } });
    if (fine.status !== "APPEAL") throw new AppError("Nenhum recurso pendente para esta multa", 400);
    await ensureMembership(req.user!.userId, req.user!.role, fine.condominiumId);

    const { appealStatus, appealResponse } = validateRequest(resolveAppealSchema, req.body);
    const newStatus = appealStatus === "ACCEPTED" ? "CANCELED" : "CONFIRMED";

    const updated = await prisma.fine.update({
      where: { id: req.params.id },
      data: { appealStatus, appealResponse, status: newStatus },
    });

    // Notifica morador
    const residents = await prisma.condominiumUser.findMany({
      where: { unitId: fine.unitId, role: "RESIDENT", isActive: true },
      select: { userId: true },
    });
    const resultLabel = appealStatus === "ACCEPTED" ? "ACEITO — multa cancelada" : "NEGADO — multa confirmada";
    for (const { userId } of residents) {
      await NotificationService.enqueue({
        userId,
        type: "FINANCIAL",
        title: `Recurso de multa: ${resultLabel}`,
        message: appealResponse,
        channels: ["inapp", "email"],
        data: { fineId: fine.id },
      });
    }

    res.json({ success: true, data: { fine: updated } });
  },
);

// PATCH /fines/:id/confirm — confirma multa sem recurso e gera cobrança
router.patch(
  "/:id/confirm",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const fine = await prisma.fine.findUniqueOrThrow({ where: { id: req.params.id } });
    await ensureMembership(req.user!.userId, req.user!.role, fine.condominiumId);

    if (!["PENDING", "APPEAL"].includes(fine.status)) {
      throw new AppError("Multa não pode ser confirmada no status atual", 400);
    }

    const updated = await prisma.fine.update({
      where: { id: req.params.id },
      data: { status: "CONFIRMED" },
    });
    res.json({ success: true, data: { fine: updated } });
  },
);

export default router;
