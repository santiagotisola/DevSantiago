import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { AppError, ForbiddenError } from "../../middleware/errorHandler";

const router = Router();

// ─── Endpoint público: porteiro escaneia QR sem autenticação pesada ────────────
// GET /visitor-qrcode/scan/:token — info pública do QR (sem dados sensíveis)
router.get("/scan/:token", async (req: Request, res: Response) => {
  const qr = await prisma.visitorQRCode.findUnique({
    where: { token: req.params.token },
    include: { unit: { select: { identifier: true, block: true, condominiumId: true } } },
  });
  if (!qr || !qr.isActive) {
    throw new AppError("QR Code inválido ou desativado", 404);
  }
  const now = new Date();
  if (now < qr.validFrom || now > qr.validUntil) {
    throw new AppError("QR Code fora do período de validade", 410);
  }
  if (qr.usedCount >= qr.maxUses) {
    throw new AppError("QR Code já atingiu o limite de usos", 410);
  }
  res.json({
    success: true,
    data: {
      visitorName: qr.visitorName,
      reason: qr.reason,
      unit: qr.unit,
      validFrom: qr.validFrom,
      validUntil: qr.validUntil,
      usesLeft: qr.maxUses - qr.usedCount,
    },
  });
});

// ─── Rotas autenticadas ─────────────────────────────────────────────────────────
router.use(authenticate);

const createSchema = z.object({
  unitId: z.string().uuid(),
  visitorName: z.string().min(2),
  visitorDoc: z.string().optional(),
  visitorPhone: z.string().optional(),
  reason: z.string().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().int().min(1).max(20).default(1),
});

// POST /visitor-qrcode — morador cria QR Code
router.post(
  "/",
  authorize("RESIDENT", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);

    // Morador só pode criar para sua própria unidade
    if (req.user!.role === "RESIDENT") {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: req.user!.userId, unitId: data.unitId, isActive: true },
      });
      if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
    }

    const qr = await prisma.visitorQRCode.create({
      data: {
        ...data,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        createdBy: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: { qrcode: qr } });
  },
);

// GET /visitor-qrcode/unit/:unitId — lista QR Codes da unidade
router.get("/unit/:unitId", async (req: Request, res: Response) => {
  if (req.user!.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: req.user!.userId, unitId: req.params.unitId, isActive: true },
    });
    if (!membership) throw new ForbiddenError("Acesso negado");
  }

  const qrcodes = await prisma.visitorQRCode.findMany({
    where: { unitId: req.params.unitId },
    include: { uses: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: { qrcodes } });
});

// DELETE /visitor-qrcode/:id — revogar QR Code
router.delete("/:id", async (req: Request, res: Response) => {
  const qr = await prisma.visitorQRCode.findUniqueOrThrow({
    where: { id: req.params.id },
  });

  if (req.user!.role === "RESIDENT" && qr.createdBy !== req.user!.userId) {
    throw new ForbiddenError("Apenas o criador pode revogar este QR Code");
  }

  await prisma.visitorQRCode.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: "QR Code revogado" });
});

// POST /visitor-qrcode/scan/:token/confirm — porteiro confirma entrada
router.post(
  "/scan/:token/confirm",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const qr = await prisma.visitorQRCode.findUnique({
      where: { token: req.params.token },
      include: { unit: true },
    });
    if (!qr || !qr.isActive) throw new AppError("QR Code inválido", 404);

    const now = new Date();
    if (now < qr.validFrom || now > qr.validUntil) {
      throw new AppError("QR Code fora do período de validade", 410);
    }
    if (qr.usedCount >= qr.maxUses) {
      throw new AppError("QR Code esgotado", 410);
    }

    // Registra visitante automaticamente como AUTHORIZED
    const [visitor] = await prisma.$transaction([
      prisma.visitor.create({
        data: {
          unitId: qr.unitId,
          name: qr.visitorName,
          document: qr.visitorDoc ?? undefined,
          phone: qr.visitorPhone ?? undefined,
          reason: qr.reason ?? "QR Code",
          status: "AUTHORIZED",
          entryAt: now,
          preAuthorizedBy: qr.createdBy,
          registeredBy: req.user!.userId,
        },
      }),
      prisma.visitorQRCode.update({
        where: { id: qr.id },
        data: {
          usedCount: { increment: 1 },
          uses: {
            create: {
              scannedBy: req.user!.userId,
              scannedAt: now,
            },
          },
        },
      }),
    ]);

    res.json({ success: true, data: { visitor } });
  },
);

export default router;
