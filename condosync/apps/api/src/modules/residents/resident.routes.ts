import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  MANAGEMENT_ROLES,
} from "../../middleware/auth";
import { ForbiddenError, ValidationError } from "../../middleware/errorHandler";
import { validateRequest } from "../../utils/validateRequest";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import { residentService } from "./resident.service";

const router = Router();
router.use(authenticate);

// Verifica que o ator pertence ativamente ao condomínio alvo (ou é
// SUPER_ADMIN). Centraliza a checagem para que cada rota com :id
// não esqueça de validar tenant scope — antes várias rotas só
// chamavam authorize() de role e o IDOR cruzava condomínios.
async function assertActorBelongsToCondominium(
  req: Request,
  condominiumId: string,
) {
  const actor = req.user!;
  if (actor.role === UserRole.SUPER_ADMIN) return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId: actor.userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomínio");
}

// Dependentes de uma unidade
router.get("/unit/:unitId/dependents", async (req: Request, res: Response) => {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: req.params.unitId },
  });
  if (req.user!.role !== "SUPER_ADMIN") {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: req.user!.userId,
        condominiumId: unit.condominiumId,
        isActive: true,
      },
    });
    if (!membership) throw new ForbiddenError("Acesso negado a esta unidade");
  }
  const dependents = await prisma.dependent.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { dependents } });
});

const dependentSchema = z.object({
  unitId: z.string().uuid(),
  name: z.string().min(2),
  relationship: z.string().min(2),
  birthDate: z.string().datetime().optional(),
  cpf: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

router.post(
  "/dependents",
  authorize(...MANAGEMENT_ROLES, UserRole.RESIDENT),
  async (req: Request, res: Response) => {
    const data = validateRequest(dependentSchema, req.body);
    // Carrega a unidade para descobrir o condomínio e validar tenant
    // scope. Antes a rota só chamava findUniqueOrThrow sem verificar
    // que o ator pertencia ao condomínio da unidade — qualquer
    // logado podia criar dependentes em unidades arbitrárias.
    const unit = await prisma.unit.findUniqueOrThrow({
      where: { id: data.unitId },
      select: { id: true, condominiumId: true },
    });
    await assertActorBelongsToCondominium(req, unit.condominiumId);

    const dependent = await prisma.dependent.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
    res.status(201).json({ success: true, data: { dependent } });
  },
);

router.delete(
  "/dependents/:id",
  authorize(...MANAGEMENT_ROLES, UserRole.RESIDENT),
  async (req: Request, res: Response) => {
    const dep = await prisma.dependent.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { id: true, unit: { select: { condominiumId: true } } },
    });
    await assertActorBelongsToCondominium(req, dep.unit.condominiumId);

    await prisma.dependent.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  },
);

// Residentes de um condomínio
router.get(
  "/condominium/:condominiumId",
  async (req: Request, res: Response) => {
    const residents = await prisma.condominiumUser.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        role: "RESIDENT",
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            cpf: true,
          },
        },
        unit: {
          select: {
            id: true,
            identifier: true,
            block: true,
            dependents: { where: { isActive: true }, orderBy: { name: "asc" } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ success: true, data: { residents } });
  },
);

const createResidentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  unitId: z.string().uuid(),
  condominiumId: z.string().uuid(),
});

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createResidentSchema, req.body);
    residentService.assertResidentRoleRequiresUnit("RESIDENT", data.unitId);
    await residentService.assertResidentUnitBelongsToCondominium(
      data.condominiumId,
      data.unitId,
    );

    // Cria ou reutiliza usuário pelo e-mail
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      const tempPassword = randomBytes(8).toString("base64url") + "A1!";
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.cpf ? { cpf: data.cpf } : {}),
          passwordHash,
          role: "RESIDENT",
        },
      });
    } else {
      // Atualiza nome, telefone e CPF com os dados do formulário
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          ...(data.phone ? { phone: data.phone } : {}),
          ...(data.cpf ? { cpf: data.cpf } : {}),
        },
      });
    }

    // Verifica se já é morador deste condomínio
    const existing = await prisma.condominiumUser.findFirst({
      where: { userId: user.id, condominiumId: data.condominiumId },
    });

    if (existing && existing.isActive) {
      res.status(409).json({
        success: false,
        message: "Morador já vinculado a este condomínio",
      });
      return;
    }

    // Reativa vínculo previamente desativado (soft-delete) ou cria novo
    const resident = existing
      ? await prisma.condominiumUser.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            unitId: data.unitId,
            role: "RESIDENT",
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, cpf: true },
            },
            unit: { select: { id: true, identifier: true, block: true } },
          },
        })
      : await prisma.condominiumUser.create({
          data: {
            userId: user.id,
            condominiumId: data.condominiumId,
            unitId: data.unitId,
            role: "RESIDENT",
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, cpf: true },
            },
            unit: { select: { id: true, identifier: true, block: true } },
          },
        });

    res.status(existing ? 200 : 201).json({ success: true, data: { resident } });
  },
);

const updateResidentSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  unitId: z.string().uuid().nullable().optional(),
});

// Atualiza dados do morador (user + unidade)
router.patch(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateResidentSchema, req.body);

    const condominiumUser = await prisma.condominiumUser.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { user: true },
    });

    // Tenant scope: admin do condo A não pode editar morador do condo B.
    await assertActorBelongsToCondominium(req, condominiumUser.condominiumId);

    if (condominiumUser.role !== "RESIDENT") {
      throw new ValidationError("Dados invalidos", {
        id: ["O registro informado nao pertence a um morador."],
      });
    }

    if (data.unitId) {
      await residentService.assertResidentUnitBelongsToCondominium(
        condominiumUser.condominiumId,
        data.unitId,
      );
    }

    // Atualiza dados do usuário
    if (data.name || data.phone !== undefined || data.cpf !== undefined) {
      await prisma.user.update({
        where: { id: condominiumUser.userId },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.cpf !== undefined ? { cpf: data.cpf || null } : {}),
        },
      });
    }

    // Atualiza unidade
    const updated = await prisma.condominiumUser.update({
      where: { id: req.params.id },
      data: { ...(data.unitId !== undefined ? { unitId: data.unitId } : {}) },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, cpf: true },
        },
        unit: { select: { id: true, identifier: true, block: true } },
      },
    });

    // Quando vincular a uma unidade, marcar como OCCUPIED
    if (data.unitId) {
      await prisma.unit.update({
        where: { id: data.unitId },
        data: { status: "OCCUPIED" },
      });
    }

    res.json({ success: true, data: { resident: updated } });
  },
);

// Remove morador do condomínio (desativa vínculo)
router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const target = await prisma.condominiumUser.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { id: true, condominiumId: true },
    });
    await assertActorBelongsToCondominium(req, target.condominiumId);

    await prisma.condominiumUser.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  },
);

export default router;
