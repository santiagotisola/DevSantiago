import { Router, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { sendMail } from "../../config/mail";
import { logger } from "../../config/logger";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";

const router = Router();

// GET /:id/avatar/file — Serve avatar image (público, sem autenticação)
router.get("/:id/avatar/file", async (req: Request, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { avatarUrl: true },
  });

  if (!user.avatarUrl) {
    return res.status(404).json({ success: false, message: "Avatar não encontrado." });
  }

  const filePath = path.join(UPLOAD_ROOT, user.avatarUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Arquivo não encontrado." });
  }

  res.set("Content-Type", "image/jpeg");
  res.set("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});

router.use(authenticate);

// Listar usuÃ¡rios do sistema (super admin)
router.get(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit) || 50,
      skip:
        ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 50),
    });
    res.json({ success: true, data: { users } });
  },
);

// M1 â€” GET /:id: SUPER_ADMIN vÃª tudo; outros sÃ³ podem ver perfil do mesmo condomÃ­nio
router.get("/:id", async (req: Request, res: Response) => {
  const actor = req.user!;

  if (actor.role !== UserRole.SUPER_ADMIN && actor.userId !== req.params.id) {
    // Verifica que ator e alvo compartilham um condomÃ­nio ativo
    const sharedCondominium = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        isActive: true,
        condominium: {
          condominiumUsers: { some: { userId: req.params.id, isActive: true } },
        },
      },
      select: { id: true },
    });
    if (!sharedCondominium) throw new ForbiddenError("Acesso negado");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      condominiumUsers: {
        include: {
          condominium: { select: { id: true, name: true } },
          unit: { select: { identifier: true, block: true } },
        },
      },
    },
  });
  res.json({ success: true, data: { user } });
});

// Atualizar perfil
router.put("/:id", async (req: Request, res: Response) => {
  if (req.user!.userId !== req.params.id && req.user!.role !== "SUPER_ADMIN") {
    return res
      .status(403)
      .json({ success: false, error: { message: "Acesso negado" } });
  }

  const schema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  });
  const data = validateRequest(schema, req.body);

  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { email: true, name: true },
  });

  const emailChanged = data.email !== undefined && data.email !== currentUser.email;

  if (emailChanged) {
    const existing = await prisma.user.findUnique({ where: { email: data.email! } });
    if (existing && existing.id !== req.params.id) {
      return res.status(409).json({
        success: false,
        error: { message: "Este e-mail já está em uso por outro usuário" },
      });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
    },
  });

  if (emailChanged) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">CondoSync — E-mail atualizado</h2>
        <p>Olá, <strong>${user.name}</strong>.</p>
        <p>Seu e-mail de acesso foi alterado com sucesso.</p>
        <p><strong>Novo e-mail:</strong> ${user.email}</p>
        <p>Se você não reconhece essa alteração, altere sua senha imediatamente.</p>
      </div>
    `;

    try {
      await sendMail(user.email, "CondoSync — E-mail atualizado", html);
      if (currentUser.email && currentUser.email !== user.email) {
        await sendMail(currentUser.email, "CondoSync — Alteração de e-mail da sua conta", html);
      }
    } catch (error) {
      logger.error("Falha ao enviar e-mail de alteração de e-mail no perfil", {
        userId: req.params.id,
        previousEmail: currentUser.email,
        newEmail: user.email,
        error,
      });
    }
  }

  res.json({ success: true, data: { user } });
});

// M3 — reset-password: SUPER_ADMIN pode redefinir senha de qualquer usuário;
//       CONDOMINIUM_ADMIN pode redefinir senha de membros do seu condomínio
router.patch(
  "/:id/reset-password",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const schema = z.object({ newPassword: z.string().min(6) });
    const { newPassword } = validateRequest(schema, req.body);

    const target = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { role: true },
    });

    if (actor.role === UserRole.CONDOMINIUM_ADMIN) {
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.CONDOMINIUM_ADMIN
      ) {
        throw new ForbiddenError(
          "Você não tem permissão para redefinir a senha deste usuário",
        );
      }
      const shared = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          isActive: true,
          condominium: {
            condominiumUsers: { some: { userId: req.params.id, isActive: true } },
          },
        },
        select: { id: true },
      });
      if (!shared)
        throw new ForbiddenError("Usuário não pertence ao seu condomínio");
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, rounds);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ success: true, message: "Senha redefinida com sucesso" });
  },
);

// M2 — toggle-active: CONDOMINIUM_ADMIN só pode desativar membros do seu condomínio;
//       não pode desativar SUPER_ADMIN nem outros admins
//       nÃ£o pode desativar SUPER_ADMIN nem outros admins
router.patch(
  "/:id/toggle-active",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { isActive: true, role: true },
    });

    if (actor.role === UserRole.CONDOMINIUM_ADMIN) {
      // Impede desativar SUPER_ADMIN ou outro CONDOMINIUM_ADMIN
      if (
        target.role === UserRole.SUPER_ADMIN ||
        target.role === UserRole.CONDOMINIUM_ADMIN
      ) {
        throw new ForbiddenError(
          "VocÃª nÃ£o tem permissÃ£o para ativar/desativar este usuÃ¡rio",
        );
      }
      // Verifica que o alvo pertence ao mesmo condomÃ­nio
      const sharedCondominium = await prisma.condominiumUser.findFirst({
        where: {
          userId: actor.userId,
          isActive: true,
          condominium: {
            condominiumUsers: {
              some: { userId: req.params.id, isActive: true },
            },
          },
        },
        select: { id: true },
      });
      if (!sharedCondominium)
        throw new ForbiddenError("UsuÃ¡rio nÃ£o pertence ao seu condomÃ­nio");
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !target.isActive },
    });
    res.json({ success: true, data: { isActive: updated.isActive } });
  },
);

// ── AVATAR UPLOAD ──────────────────────────────────────────────────────────────
const ALLOWED_AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_ROOT = path.resolve(env.UPLOAD_PATH);

const avatarStorage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const userId = req.params.id;
    const dir = path.resolve(UPLOAD_ROOT, "avatars", userId);
    if (!dir.startsWith(UPLOAD_ROOT + path.sep)) return cb(new Error("Path inválido"), UPLOAD_ROOT);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function avatarFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  ALLOWED_AVATAR_MIMES.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Apenas imagens (JPG, PNG, WebP) são permitidas."));
}

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: MAX_AVATAR_SIZE },
});

// POST /:id/avatar — Upload avatar
router.post(
  "/:id/avatar",
  authenticate,
  avatarUpload.single("file"),
  async (req: Request, res: Response) => {
    if (req.user!.userId !== req.params.id && req.user!.role !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Acesso negado" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Nenhuma imagem enviada." });
    }

    const photoPath = `avatars/${req.params.id}/${path.basename(req.file.filename!)}`;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { avatarUrl: photoPath },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    res.status(201).json({ success: true, data: { user } });
  },
);

// DELETE /:id/avatar — Remove avatar
router.delete("/:id/avatar", authenticate, async (req: Request, res: Response) => {
  if (req.user!.userId !== req.params.id && req.user!.role !== "SUPER_ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Acesso negado" });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { avatarUrl: true },
  });

  if (user.avatarUrl) {
    const filePath = path.join(UPLOAD_ROOT, user.avatarUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { avatarUrl: null },
  });

  res.json({ success: true });
});

export default router;
