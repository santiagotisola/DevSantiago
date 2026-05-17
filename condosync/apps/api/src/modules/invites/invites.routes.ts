import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const createInviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["RESIDENT", "DOORMAN", "SYNDIC", "COUNCIL_MEMBER", "SERVICE_PROVIDER"]),
});

const INVITE_EXPIRATION_DAYS = 7;

// GET /api/v1/condominiums/:condominiumId/invites
router.get("/", async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string;

  if (!condominiumId) {
    return res.status(400).json({ success: false, message: "condominiumId é obrigatório" });
  }

  // Validar acesso ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId,
      isActive: true,
    },
  });

  if (!membership && req.user!.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Acesso negado a este condomínio");
  }

  // Mock: retornar lista vazia (seria de um modelo Invite no futuro)
  const invites: any[] = [];

  res.json({ success: true, data: { invites } });
});

// POST /api/v1/condominiums/:condominiumId/invites - Enviar novo convite
router.post("/", async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string;
  const data = validateRequest(createInviteSchema, req.body);

  if (!condominiumId) {
    return res.status(400).json({ success: false, message: "condominiumId é obrigatório" });
  }

  // Validar acesso ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId,
      isActive: true,
      role: { in: ["CONDOMINIUM_ADMIN", "SYNDIC"] },
    },
  });

  if (!membership && req.user!.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Apenas administradores podem enviar convites");
  }

  // Mock: retornar convite criado
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRATION_DAYS);

  const invite = {
    id: `invite_${Date.now()}`,
    email: data.email,
    role: data.role,
    status: "PENDING",
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({ success: true, data: { invite } });
});

// DELETE /api/v1/condominiums/:condominiumId/invites/:inviteId - Cancelar convite
router.delete("/:inviteId", async (req: Request, res: Response) => {
  const condominiumId = req.query.condominiumId as string;
  const { inviteId } = req.params;

  if (!condominiumId) {
    return res.status(400).json({ success: false, message: "condominiumId é obrigatório" });
  }

  // Validar acesso ao condomínio
  const membership = await prisma.condominiumUser.findFirst({
    where: {
      userId: req.user!.userId,
      condominiumId,
      isActive: true,
      role: { in: ["CONDOMINIUM_ADMIN", "SYNDIC"] },
    },
  });

  if (!membership && req.user!.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Acesso negado");
  }

  // Mock: retornar sucesso
  res.json({ success: true, message: "Convite cancelado com sucesso" });
});

export default router;
