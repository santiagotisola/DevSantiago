import { Router, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import {
  authenticate,
  authorize,
  authorizeCondominium,
} from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";

const log = logger.child({ module: "gallery.routes" });
const router = Router();
router.use(authenticate);

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const condoId = req.params.condominiumId || "misc";
    const dir = path.join("/app/uploads", condoId, "gallery");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  ALLOWED_MIMES.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Apenas imagens são permitidas."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

const CATEGORIES = ["areas-comuns", "eventos", "obras", "outro"] as const;

const metaSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).default("outro"),
});

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get(
  "/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { category } = req.query;
    const photos = await prisma.photo.findMany({
      where: {
        condominiumId: req.params.condominiumId,
        ...(category ? { category: category as string } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        uploadedBy: true,
      },
    });
    res.json({ success: true, data: { photos } });
  },
);

// ── UPLOAD ───────────────────────────────────────────────────────────────────
router.post(
  "/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "Nenhuma imagem enviada." });
      return;
    }
    const meta = validateRequest(metaSchema, req.body);
    const photo = await prisma.photo.create({
      data: {
        condominiumId: req.params.condominiumId,
        title: meta.title,
        description: meta.description,
        category: meta.category as string,
        fileName: req.file.originalname,
        storedName: path.basename(req.file.filename!),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user!.userId,
      },
    });
    log.info(`Photo uploaded: ${photo.id} by ${req.user!.userId}`);
    res.status(201).json({ success: true, data: { photo } });
  },
);

// ── SERVE IMAGE ───────────────────────────────────────────────────────────────
router.get(
  "/:condominiumId/:id/file",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const photo = await prisma.photo.findFirstOrThrow({
      where: { id: req.params.id, condominiumId: req.params.condominiumId },
    });
    if (!fs.existsSync(photo.filePath)) {
      res
        .status(404)
        .json({ success: false, message: "Arquivo não encontrado." });
      return;
    }
    res.set("Content-Type", photo.mimeType);
    res.set("Cache-Control", "private, max-age=3600");
    fs.createReadStream(photo.filePath).pipe(res);
  },
);

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete(
  "/:condominiumId/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const photo = await prisma.photo.findFirstOrThrow({
      where: { id: req.params.id, condominiumId: req.params.condominiumId },
    });
    if (fs.existsSync(photo.filePath)) {
      fs.unlinkSync(photo.filePath);
    }
    await prisma.photo.delete({ where: { id: photo.id } });
    res.json({ success: true });
  },
);

export default router;
