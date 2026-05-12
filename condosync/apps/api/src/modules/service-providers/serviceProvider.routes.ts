import { Router, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError } from "../../middleware/errorHandler";
import { z } from "zod";
import { env } from "../../config/env";

const router = Router();
router.use(authenticate);

/** Verifica que o ator pertence ao condomÃ­nio indicado */
async function ensureCondominiumMembership(
  userId: string,
  role: string,
  condominiumId: string,
) {
  if (role === "SUPER_ADMIN") return;
  const membership = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
    select: { id: true },
  });
  if (!membership) throw new ForbiddenError("Acesso negado a este condomÃ­nio");
}

const schema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  serviceType: z.string().min(2),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

router.get(
  "/condominium/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const providers = await prisma.serviceProvider.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(req.query.approved && {
          isApproved: req.query.approved === "true",
        }),
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: { providers } });
  },
);

// L4 â€” verifica membership para condominiumId do body
router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(schema, req.body);
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      data.condominiumId,
    );
    const provider = await prisma.serviceProvider.create({ data });
    res.status(201).json({ success: true, data: { provider } });
  },
);

// L1 â€” IDOR fix: verifica tenant antes de editar
router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    const data = validateRequest(schema.partial(), req.body);
    const provider = await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { provider } });
  },
);

// L2 â€” IDOR fix: verifica tenant antes de aprovar
router.patch(
  "/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    const provider = await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data: { isApproved: true },
    });
    res.json({ success: true, data: { provider } });
  },
);

// L3 â€” IDOR fix: verifica tenant antes de deletar
router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );
    await prisma.serviceProvider.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  },
);
// ── PHOTO UPLOAD ───────────────────────────────────────────────────────────────
const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_ROOT = path.resolve(env.UPLOAD_PATH);

const photoStorage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const providerId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, "service-providers", providerId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function photoFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  ALLOWED_PHOTO_MIMES.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Apenas imagens (JPG, PNG, WebP) são permitidas."));
}

const photoUpload = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: { fileSize: MAX_PHOTO_SIZE },
});

// POST /:id/photo — Upload photo
router.post(
  "/:id/photo",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  photoUpload.single("file"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Nenhuma imagem enviada." });
    }

    const photoPath = `service-providers/${req.params.id}/${path.basename(req.file.filename!)}`;
    const provider = await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data: { photoUrl: photoPath },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
    });

    res.status(201).json({ success: true, data: { provider } });
  },
);

// GET /:id/photo/file — Serve photo image
router.get("/:id/photo/file", async (req: Request, res: Response) => {
  const provider = await prisma.serviceProvider.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { photoUrl: true },
  });

  if (!provider.photoUrl) {
    return res.status(404).json({ success: false, message: "Foto não encontrada." });
  }

  const filePath = path.join(UPLOAD_ROOT, provider.photoUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Arquivo não encontrado." });
  }

  res.set("Content-Type", "image/jpeg");
  res.set("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /:id/photo — Remove photo
router.delete(
  "/:id/photo",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.serviceProvider.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { condominiumId: true, photoUrl: true },
    });
    await ensureCondominiumMembership(
      req.user!.userId,
      req.user!.role,
      existing.condominiumId,
    );

    if (existing.photoUrl) {
      const filePath = path.join(UPLOAD_ROOT, existing.photoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.serviceProvider.update({
      where: { id: req.params.id },
      data: { photoUrl: null },
    });

    res.json({ success: true });
  },
);
export default router;
