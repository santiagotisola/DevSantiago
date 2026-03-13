import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { ForbiddenError } from "../../middleware/errorHandler";

const router = Router();

const MGMT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"] as const;

const createSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(3),
  category: z
    .enum(["manutencao", "financeiro", "barulho", "seguranca", "outro"])
    .default("outro"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  message: z.string().min(1),
});

const messageSchema = z.object({
  content: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

async function ensureTicketAccess(
  userId: string,
  role: UserRole,
  ticketId: string,
  options?: { managementOnly?: boolean; residentOwnOnly?: boolean },
) {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: {
      id: true,
      condominiumId: true,
      createdById: true,
    },
  });

  if (role === UserRole.SUPER_ADMIN) {
    return ticket;
  }

  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId: ticket.condominiumId, isActive: true },
    select: { role: true },
  });

  if (!membership) {
    throw new ForbiddenError("Acesso negado a este ticket");
  }

  const isStaff =
    membership.role === UserRole.CONDOMINIUM_ADMIN ||
    membership.role === UserRole.SYNDIC ||
    membership.role === UserRole.DOORMAN;

  if (options?.managementOnly && !isStaff) {
    throw new ForbiddenError("Apenas a administracao pode executar esta acao");
  }

  if (options?.residentOwnOnly && !isStaff && ticket.createdById !== userId) {
    throw new ForbiddenError("Morador so pode acessar o proprio ticket");
  }

  return ticket;
}

router.get(
  "/:condominiumId",
  authenticate,
  authorizeCondominium,
  async (req, res) => {
    try {
      const { condominiumId } = req.params;
      const { status, category } = req.query as Record<string, string>;
      const user = req.user!;
      const isStaff =
        user.role === UserRole.CONDOMINIUM_ADMIN ||
        user.role === UserRole.SYNDIC ||
        user.role === UserRole.DOORMAN ||
        user.role === UserRole.SUPER_ADMIN;

      const where: Record<string, unknown> = { condominiumId };
      if (!isStaff) where.createdById = user.userId;
      if (status) where.status = status;
      if (category) where.category = category;

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: {
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      });

      res.json({ success: true, data: { tickets } });
    } catch {
      res
        .status(500)
        .json({ success: false, message: "Erro ao listar tickets" });
    }
  },
);

router.get("/detail/:id", authenticate, async (req, res) => {
  try {
    const user = req.user!;
    await ensureTicketAccess(user.userId, user.role, req.params.id, {
      residentOwnOnly: true,
    });

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket nao encontrado" });
    }

    res.json({ success: true, data: { ticket } });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Erro ao buscar ticket" });
  }
});

router.post("/", authenticate, authorizeCondominium, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const user = req.user!;

    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: {
          condominiumId: data.condominiumId,
          title: data.title,
          category: data.category,
          priority: data.priority,
          createdById: user.userId,
        },
      });
      await tx.ticketMessage.create({
        data: { ticketId: t.id, senderId: user.userId, content: data.message },
      });
      return t;
    });

    res.status(201).json({ success: true, data: { ticket } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Erro ao criar ticket" });
  }
});

router.post("/:id/messages", authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { content } = messageSchema.parse(req.body);
    const ticket = await ensureTicketAccess(user.userId, user.role, req.params.id, {
      residentOwnOnly: true,
    });

    const current = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      select: { id: true, status: true },
    });

    if (current.status === "CLOSED") {
      return res.status(400).json({ success: false, message: "Ticket fechado" });
    }

    const isStaff =
      user.role === UserRole.CONDOMINIUM_ADMIN ||
      user.role === UserRole.SYNDIC ||
      user.role === UserRole.DOORMAN ||
      user.role === UserRole.SUPER_ADMIN;

    const [message] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: { ticketId: ticket.id, senderId: user.userId, content },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: isStaff ? "IN_PROGRESS" : current.status,
          updatedAt: new Date(),
        },
      }),
    ]);

    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ success: false, message: err.message });
    }
    res
      .status(500)
      .json({ success: false, message: "Erro ao enviar mensagem" });
  }
});

router.patch(
  "/:id",
  authenticate,
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const user = req.user!;
      const data = updateSchema.parse(req.body);
      await ensureTicketAccess(user.userId, user.role, req.params.id, {
        managementOnly: true,
      });

      const ticket = await prisma.ticket.update({
        where: { id: req.params.id },
        data,
      });
      res.json({ success: true, data: { ticket } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ success: false, message: err.message });
      }
      res
        .status(500)
        .json({ success: false, message: "Erro ao atualizar ticket" });
    }
  },
);

router.delete(
  "/:id",
  authenticate,
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const user = req.user!;
      await ensureTicketAccess(user.userId, user.role, req.params.id, {
        managementOnly: true,
      });

      await prisma.ticket.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return res.status(403).json({ success: false, message: err.message });
      }
      res.status(500).json({ success: false, message: "Erro ao excluir ticket" });
    }
  },
);

export default router;
