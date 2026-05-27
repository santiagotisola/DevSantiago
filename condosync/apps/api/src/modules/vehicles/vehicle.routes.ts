import { Router, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { authenticate, authorize, authorizeCondominium } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { ForbiddenError } from "../../middleware/errorHandler";
import { env } from "../../config/env";
import { NotificationService } from "../../notifications/notification.service";

const router = Router();
router.use(authenticate);

const vehicleSchema = z.object({
  unitId: z.string().uuid(),
  plate: z
    .string()
    .min(7)
    .max(8)
    .transform((s) => s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()),
  brand: z.string().min(2),
  model: z.string().min(2),
  color: z.string().min(2),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .optional(),
  type: z.enum(["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE", "OTHER"]).optional(),
});

// N1 — verifica que o ator pertence ao condomínio da unidade
router.get("/unit/:unitId", async (req: Request, res: Response) => {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: req.params.unitId },
    select: { condominiumId: true },
  });
  if (req.user!.role !== "SUPER_ADMIN") {
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: req.user!.userId,
        condominiumId: unit.condominiumId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError("Acesso negado a esta unidade");
    }
  }
  const vehicles = await prisma.vehicle.findMany({
    where: { unitId: req.params.unitId, isActive: true },
  });
  res.json({ success: true, data: { vehicles } });
});

router.post("/", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema, req.body);

  // Residents can only add vehicles to their own unit
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: data.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você só pode cadastrar veículos na sua unidade.",
      );
    }
  }

  const vehicle = await prisma.vehicle.create({ data });
  res.status(201).json({ success: true, data: { vehicle } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const data = validateRequest(vehicleSchema.partial(), req.body);

  // Ensure vehicle belongs to the user's unit if RESIDENT
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      select: { unitId: true },
    });
    if (!existing) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para editar este veículo.",
      );
    }
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: existing.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para editar este veículo.",
      );
    }
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: { vehicle } });
});

router.delete("/:id", async (req: Request, res: Response) => {
  // Ensure vehicle belongs to the user's unit if RESIDENT
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const existing = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      select: { unitId: true },
    });
    if (!existing) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para remover este veículo.",
      );
    }
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: existing.unitId },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Proibido: você não tem permissão para remover este veículo.",
      );
    }
  }

  await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
});

// Registro de acesso de veículos
router.get(
  "/access-logs/:condominiumId",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  authorizeCondominium,
  async (req: Request, res: Response) => {
    // Busca IDs de todas as unidades do condomínio para filtrar logs sem vehicleId
    const unitIds = (
      await prisma.unit.findMany({
        where: { condominiumId: req.params.condominiumId },
        select: { id: true },
      })
    ).map((u) => u.id);

    const logs = await prisma.vehicleAccessLog.findMany({
      where: {
        // N2 — terceira cláusula removida: vazava logs de outros condomínios
        OR: [
          { vehicle: { unit: { condominiumId: req.params.condominiumId } } },
          { vehicleId: null, unitId: { in: unitIds } },
        ],
      },
      include: {
        vehicle: {
          include: { unit: { select: { identifier: true, block: true } } },
        },
      },
      orderBy: { entryAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: { logs } });
  },
);

router.post(
  "/access-logs",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      plate: z.string().min(1),
      vehicleId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      isResident: z.boolean().optional(),
      notes: z.string().optional(),
    });
    const data = validateRequest(schema, req.body);

    // Tenta vincular automaticamente ao veículo cadastrado pela placa
    let vehicleId = data.vehicleId;
    let unitId = data.unitId;
    if (!vehicleId) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          plate: data.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
          isActive: true,
        },
      });
      if (existing) {
        vehicleId = existing.id;
        unitId = unitId ?? existing.unitId;
      }
    }

    const log = await prisma.vehicleAccessLog.create({
      data: { ...data, vehicleId, unitId, registeredBy: req.user!.userId },
    });

    // Notifica morador se o veículo pertence a uma unidade identificada
    if (unitId) {
      const unitUsers = await prisma.condominiumUser.findMany({
        where: { unitId, isActive: true, role: 'RESIDENT' },
        select: { userId: true },
      });
      const vehicleInfo = vehicleId
        ? await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { brand: true, model: true, color: true, plate: true } })
        : null;

      await Promise.all(unitUsers.map(u =>
        NotificationService.enqueue({
          userId: u.userId,
          type: 'VISITOR',
          title: '🚗 Veículo entrou no condomínio',
          message: `Veículo ${vehicleInfo ? `${vehicleInfo.brand} ${vehicleInfo.model} ${vehicleInfo.color}` : data.plate} (${data.plate}) registrou entrada`,
          data: { logId: log.id, plate: data.plate, vehicleId, unitId },
          channels: ['inapp', 'whatsapp'],
        })
      ));
    }

    res.status(201).json({ success: true, data: { log } });
  },
);

// N3 — IDOR fix: verifica tenant do log antes de registrar saída
router.patch(
  "/access-logs/:id/exit",
  authorize("DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.vehicleAccessLog.findUniqueOrThrow({
      where: { id: req.params.id },
      select: {
        id: true,
        vehicle: { select: { unit: { select: { condominiumId: true } } } },
        unitId: true,
      },
    });

    const condominiumId =
      existing.vehicle?.unit?.condominiumId ??
      (existing.unitId
        ? (
            await prisma.unit.findUnique({
              where: { id: existing.unitId },
              select: { condominiumId: true },
            })
          )?.condominiumId
        : null);

    if (condominiumId && req.user!.role !== "SUPER_ADMIN") {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: req.user!.userId, condominiumId, isActive: true },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenError("Acesso negado a este log");
      }
    }

    const log = await prisma.vehicleAccessLog.update(
      {
      where: { id: req.params.id },
      data: { exitAt: new Date() },
    });

    // Notifica morador sobre saída do veículo
    const logWithUnit = await prisma.vehicleAccessLog.findUnique({
      where: { id: req.params.id },
      select: { unitId: true, plate: true, vehicle: { select: { brand: true, model: true, color: true } } },
    });
    if (logWithUnit?.unitId) {
      const unitUsers = await prisma.condominiumUser.findMany({
        where: { unitId: logWithUnit.unitId, isActive: true, role: 'RESIDENT' },
        select: { userId: true },
      });
      await Promise.all(unitUsers.map(u =>
        NotificationService.enqueue({
          userId: u.userId,
          type: 'VISITOR',
          title: '🚗 Veículo saiu do condomínio',
          message: `Veículo ${logWithUnit.vehicle ? `${logWithUnit.vehicle.brand} ${logWithUnit.vehicle.model}` : logWithUnit.plate} (${logWithUnit.plate}) registrou saída`,
          data: { logId: req.params.id, plate: logWithUnit.plate },
          channels: ['inapp', 'whatsapp'],
        })
      ));
    }

    res.json({ success: true, data: { log } });
  },
);

// ── PHOTO UPLOAD ───────────────────────────────────────────────────────────────
const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_ROOT = path.resolve(env.UPLOAD_PATH);

const photoStorage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    const vehicleId = req.params.id;
    const dir = path.resolve(UPLOAD_ROOT, "vehicles", vehicleId);
    if (!dir.startsWith(UPLOAD_ROOT + path.sep)) return cb(new Error("Path inválido"), UPLOAD_ROOT);
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
  authenticate,
  photoUpload.single("file"),
  async (req: Request, res: Response) => {
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { unitId: true },
    });

    // Residents can only upload photos for their own vehicles
    const user = req.user!;
    if (user.role === "RESIDENT") {
      const membership = await prisma.condominiumUser.findFirst({
        where: { userId: user.userId, unitId: vehicle.unitId },
        select: { id: true },
      });
      if (!membership) {
        return res
          .status(403)
          .json({ success: false, message: "Acesso negado" });
      }
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Nenhuma imagem enviada." });
    }

    const photoPath = `vehicles/${req.params.id}/${path.basename(req.file.filename!)}`;
    const updated = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { photoUrl: photoPath },
      select: {
        id: true,
        plate: true,
        brand: true,
        model: true,
        photoUrl: true,
      },
    });

    res.status(201).json({ success: true, data: { vehicle: updated } });
  },
);

// GET /:id/photo/file — Serve photo image
router.get("/:id/photo/file", async (req: Request, res: Response) => {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { photoUrl: true },
  });

  if (!vehicle.photoUrl) {
    return res.status(404).json({ success: false, message: "Foto não encontrada." });
  }

  const filePath = path.join(UPLOAD_ROOT, vehicle.photoUrl);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Arquivo não encontrado." });
  }

  res.set("Content-Type", "image/jpeg");
  res.set("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});

// DELETE /:id/photo — Remove photo
router.delete("/:id/photo", authenticate, async (req: Request, res: Response) => {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { unitId: true, photoUrl: true },
  });

  // Residents can only delete photos for their own vehicles
  const user = req.user!;
  if (user.role === "RESIDENT") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: user.userId, unitId: vehicle.unitId },
      select: { id: true },
    });
    if (!membership) {
      return res
        .status(403)
        .json({ success: false, message: "Acesso negado" });
    }
  }

  if (vehicle.photoUrl) {
    const filePath = path.join(UPLOAD_ROOT, vehicle.photoUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { photoUrl: null },
  });

  res.json({ success: true });
});

export default router;
