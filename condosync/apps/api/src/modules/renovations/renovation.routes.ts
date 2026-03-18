import { Router, Request, Response } from "express";
import { RenovationStatus, UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const renovationSchema = z.object({
  unitId: z.string().uuid(),
  condominiumId: z.string().uuid(),
  description: z.string().min(10),
  type: z.enum(["pintura", "hidráulica", "elétrica", "estrutural", "outro"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const providerSchema = z.object({
  name: z.string().min(2),
  serviceType: z.string().min(2),
  document: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

async function findMembership(userId: string, condominiumId: string) {
  return prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { role: true, unitId: true },
  });
}

async function ensureUnitAccess(req: Request, unitId: string) {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { id: true, condominiumId: true },
  });

  if (req.user!.role === UserRole.SUPER_ADMIN) {
    return unit;
  }

  const membership = await findMembership(req.user!.userId, unit.condominiumId);
  if (!membership) {
    throw new ForbiddenError("Acesso negado a esta unidade");
  }

  if (membership.role === UserRole.RESIDENT && membership.unitId !== unit.id) {
    throw new ForbiddenError("Morador so pode acessar a propria unidade");
  }

  return unit;
}

async function ensureRenovationAccess(
  req: Request,
  renovationId: string,
  options?: { managementOnly?: boolean; residentOwnOnly?: boolean },
) {
  const renovation = await prisma.renovation.findUniqueOrThrow({
    where: { id: renovationId },
    select: {
      id: true,
      condominiumId: true,
      unitId: true,
      createdBy: true,
    },
  });

  if (req.user!.role === UserRole.SUPER_ADMIN) {
    return renovation;
  }

  const membership = await findMembership(
    req.user!.userId,
    renovation.condominiumId,
  );
  if (!membership) {
    throw new ForbiddenError("Acesso negado a esta obra");
  }

  const isManagement = membership.role !== UserRole.RESIDENT;
  if (options?.managementOnly && !isManagement) {
    throw new ForbiddenError("Apenas administradores podem executar esta acao");
  }

  if (membership.role === UserRole.RESIDENT) {
    const ownsUnit = membership.unitId === renovation.unitId;
    const isCreator = renovation.createdBy === req.user!.userId;

    if (!ownsUnit || (options?.residentOwnOnly && !isCreator)) {
      throw new ForbiddenError("Morador so pode acessar a propria obra");
    }
  }

  return renovation;
}

router.get(
  "/condominium/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const renovations = await prisma.renovation.findMany({
      where: { condominiumId: req.params.condominiumId },
      include: {
        unit: { select: { identifier: true, block: true } },
        authorizedProviders: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: { renovations } });
  },
);

router.get("/unit/:unitId", async (req: Request, res: Response) => {
  await ensureUnitAccess(req, req.params.unitId);

  const renovations = await prisma.renovation.findMany({
    where: { unitId: req.params.unitId },
    include: { authorizedProviders: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: { renovations } });
});

// Portaria: prestadores autorizados em obras ativas de uma unidade
router.get(
  "/unit/:unitId/active-providers",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: req.params.unitId },
      select: { condominiumId: true },
    });

    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      const membership = await findMembership(
        req.user!.userId,
        unit.condominiumId,
      );
      if (!membership) throw new ForbiddenError("Acesso negado");
    }

    const renovations = await prisma.renovation.findMany({
      where: {
        unitId: req.params.unitId,
        status: {
          in: [RenovationStatus.APPROVED, RenovationStatus.IN_PROGRESS],
        },
      },
      include: { authorizedProviders: true },
      orderBy: { startDate: "asc" },
    });
    res.json({ success: true, data: { renovations } });
  },
);

router.post("/",
  authorize("RESIDENT", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
  const data = validateRequest(renovationSchema, req.body);
  const unit = await ensureUnitAccess(req, data.unitId);

  if (unit.condominiumId !== data.condominiumId) {
    throw new ForbiddenError("A unidade informada nao pertence ao condominio");
  }

  const renovation = await prisma.renovation.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      createdBy: req.user!.userId,
    },
    include: { authorizedProviders: true },
  });
  res.status(201).json({ success: true, data: { renovation } });
});

router.patch(
  "/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await ensureRenovationAccess(req, req.params.id, { managementOnly: true });

    const { approved, reason } = z
      .object({ approved: z.boolean(), reason: z.string().optional() })
      .parse(req.body);

    const renovation = await prisma.renovation.update({
      where: { id: req.params.id },
      data: {
        status: approved
          ? RenovationStatus.APPROVED
          : RenovationStatus.REJECTED,
        approvedBy: approved ? req.user!.userId : null,
        approvedAt: approved ? new Date() : null,
        rejectedReason: approved ? null : (reason ?? null),
      },
      include: { authorizedProviders: true },
    });

    res.json({ success: true, data: { renovation } });
  },
);

router.patch("/:id/status", async (req: Request, res: Response) => {
  await ensureRenovationAccess(req, req.params.id, { residentOwnOnly: true });

  const { status } = z
    .object({
      status: z.enum(["IN_PROGRESS", "COMPLETED"]),
    })
    .parse(req.body);

  const renovation = await prisma.renovation.update({
    where: { id: req.params.id },
    data: { status: status as RenovationStatus },
    include: { authorizedProviders: true },
  });
  res.json({ success: true, data: { renovation } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  await ensureRenovationAccess(req, req.params.id, { residentOwnOnly: true });
  await prisma.renovation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post("/:id/providers", async (req: Request, res: Response) => {
  await ensureRenovationAccess(req, req.params.id, { residentOwnOnly: true });

  const data = validateRequest(providerSchema, req.body);
  const provider = await prisma.renovationProvider.create({
    data: { renovationId: req.params.id, ...data },
  });
  res.status(201).json({ success: true, data: { provider } });
});

router.delete(
  "/:id/providers/:providerId",
  async (req: Request, res: Response) => {
    await ensureRenovationAccess(req, req.params.id, {
      residentOwnOnly: true,
    });

    const provider = await prisma.renovationProvider.findFirstOrThrow({
      where: {
        id: req.params.providerId,
        renovationId: req.params.id,
      },
      select: { id: true },
    });

    await prisma.renovationProvider.delete({
      where: { id: provider.id },
    });
    res.json({ success: true });
  },
);

export default router;
