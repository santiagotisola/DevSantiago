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

const log = logger.child({ module: "document.routes" });

const router = Router();
router.use(authenticate);

// ── Allowed MIME types ────────────────────────────────────────
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Multer storage ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const condoId =
      req.params.condominiumId || req.body.condominiumId || "misc";
    const dir = path.join("/app/uploads", condoId);
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
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo não permitido."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

// ── Schemas ──────────────────────────────────────────────────
const metaSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum([
    "ata",
    "convenção",
    "regulamento",
    "boleto",
    "comunicado",
    "outro",
  ]),
});

// ── Routes ───────────────────────────────────────────────────

// LIST
router.get(
  "/:condominiumId",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const { condominiumId } = req.params;
    const { category } = req.query;
    const docs = await prisma.condominiumDocument.findMany({
      where: {
        condominiumId,
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
    res.json({ success: true, data: { documents: docs } });
  },
);

// UPLOAD
router.post(
  "/:condominiumId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "Nenhum arquivo enviado." });
      return;
    }
    const meta = validateRequest(metaSchema, req.body);
    const doc = await prisma.condominiumDocument.create({
      data: {
        condominiumId: req.params.condominiumId,
        title: meta.title,
        description: meta.description,
        category: meta.category,
        fileName: req.file.originalname,
        storedName: path.basename(req.file.filename),
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user!.userId,
      },
    });
    log.info(`Document uploaded: ${doc.id} by ${req.user!.userId}`);
    res.status(201).json({ success: true, data: { document: doc } });
  },
);

// DOWNLOAD / stream
router.get(
  "/:condominiumId/:id/download",
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const doc = await prisma.condominiumDocument.findFirstOrThrow({
      where: { id: req.params.id, condominiumId: req.params.condominiumId },
    });
    if (!fs.existsSync(doc.filePath)) {
      res
        .status(404)
        .json({
          success: false,
          message: "Arquivo não encontrado no servidor.",
        });
      return;
    }
    res.download(doc.filePath, doc.fileName);
  },
);

// DELETE (soft = physical delete of file + record)
router.delete(
  "/:condominiumId/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    const doc = await prisma.condominiumDocument.findFirstOrThrow({
      where: { id: req.params.id, condominiumId: req.params.condominiumId },
    });
    // Remove physical file
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }
    await prisma.condominiumDocument.delete({ where: { id: doc.id } });
    log.info(`Document deleted: ${doc.id} by ${req.user!.userId}`);
    res.json({ success: true });
  },
);

export default router;
