import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { ForbiddenError, AppError } from "../../middleware/errorHandler";

const router = Router();

// ─── Endpoint PÚBLICO: TV busca feed sem autenticação ─────────────────────────
// GET /digital-signage/display/:token — retorna slides + anúncios + aniversariantes
router.get("/display/:token", async (req: Request, res: Response) => {
  const screen = await prisma.digitalSignageScreen.findUnique({
    where: { token: req.params.token },
    include: {
      slides: {
        where: {
          isActive: true,
          OR: [
            { validFrom: null },
            { validFrom: { lte: new Date() } },
          ],
          AND: [
            { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
          ],
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!screen || !screen.isActive) {
    throw new AppError("Tela não encontrada ou desativada", 404);
  }

  // Busca comunicados ativos do condomínio para slide automático
  const announcements = await prisma.announcement.findMany({
    where: {
      condominiumId: screen.condominiumId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 5,
  });

  // Busca aniversariantes do dia (dependentes + moradores)
  const today = new Date();
  const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const dependents = await prisma.dependent.findMany({
    where: {
      unit: { condominiumId: screen.condominiumId },
      isActive: true,
      birthDate: { not: null },
    },
    select: { name: true, birthDate: true },
  });

  const birthdays = dependents.filter((d) => {
    if (!d.birthDate) return false;
    const bd = d.birthDate;
    const bdMD = `${String(bd.getMonth() + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`;
    return bdMD === todayMD;
  });

  // Busca ofertas ativas do marketplace
  const offers = await prisma.marketplaceOffer.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    },
    include: { partner: { select: { name: true, logoUrl: true, category: true } } },
    take: 3,
  });

  res.json({
    success: true,
    data: {
      screen: {
        name: screen.name,
        location: screen.location,
        slideDuration: screen.slideDuration,
        primaryColor: screen.primaryColor,
        logoUrl: screen.logoUrl,
      },
      slides: screen.slides,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        isPinned: a.isPinned,
      })),
      birthdays: birthdays.map((b) => ({ name: b.name })),
      offers: offers.map((o) => ({
        title: o.title,
        discount: o.discount,
        partner: o.partner.name,
        logoUrl: o.partner.logoUrl,
      })),
    },
  });
});

// ─── Rotas autenticadas ────────────────────────────────────────────────────────
router.use(authenticate);

const MGMT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"] as const;

async function ensureMembership(userId: string, role: string, condominiumId: string) {
  if (role === "SUPER_ADMIN") return;
  const m = await prisma.condominiumUser.findFirst({
    where: { userId, condominiumId, isActive: true },
  });
  if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
}

const screenSchema = z.object({
  condominiumId: z.string().uuid(),
  name: z.string().min(2),
  location: z.string().min(2),
  slideDuration: z.number().int().min(3).max(60).default(8),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1e40af"),
  logoUrl: z.string().url().optional(),
});

const slideSchema = z.object({
  type: z.enum(["TEXT", "IMAGE", "ANNOUNCEMENT", "BIRTHDAY", "CLOCK", "MARKETPLACE"]),
  title: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  order: z.number().int().default(0),
  duration: z.number().int().min(3).max(120).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

// GET /digital-signage/screens/:condominiumId
router.get(
  "/screens/:condominiumId",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    await ensureMembership(req.user!.userId, req.user!.role, req.params.condominiumId);
    const screens = await prisma.digitalSignageScreen.findMany({
      where: { condominiumId: req.params.condominiumId },
      include: { _count: { select: { slides: true } } },
    });
    res.json({ success: true, data: { screens } });
  },
);

// POST /digital-signage/screens
router.post(
  "/screens",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const data = validateRequest(screenSchema, req.body);
    await ensureMembership(req.user!.userId, req.user!.role, data.condominiumId);
    const screen = await prisma.digitalSignageScreen.create({ data });
    res.status(201).json({ success: true, data: { screen } });
  },
);

// PATCH /digital-signage/screens/:id
router.patch(
  "/screens/:id",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const screen = await prisma.digitalSignageScreen.findUniqueOrThrow({ where: { id: req.params.id } });
    await ensureMembership(req.user!.userId, req.user!.role, screen.condominiumId);
    const data = screenSchema.partial().omit({ condominiumId: true }).parse(req.body);
    const updated = await prisma.digitalSignageScreen.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { screen: updated } });
  },
);

// DELETE /digital-signage/screens/:id
router.delete(
  "/screens/:id",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const screen = await prisma.digitalSignageScreen.findUniqueOrThrow({ where: { id: req.params.id } });
    await ensureMembership(req.user!.userId, req.user!.role, screen.condominiumId);
    await prisma.digitalSignageScreen.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Tela removida" });
  },
);

// GET /digital-signage/screens/:id/slides
router.get(
  "/screens/:id/slides",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const screen = await prisma.digitalSignageScreen.findUniqueOrThrow({ where: { id: req.params.id } });
    await ensureMembership(req.user!.userId, req.user!.role, screen.condominiumId);
    const slides = await prisma.digitalSignageSlide.findMany({
      where: { screenId: req.params.id },
      orderBy: { order: "asc" },
    });
    res.json({ success: true, data: { slides } });
  },
);

// POST /digital-signage/screens/:id/slides
router.post(
  "/screens/:id/slides",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const screen = await prisma.digitalSignageScreen.findUniqueOrThrow({ where: { id: req.params.id } });
    await ensureMembership(req.user!.userId, req.user!.role, screen.condominiumId);
    const data = validateRequest(slideSchema, req.body);
    const slide = await prisma.digitalSignageSlide.create({
      data: {
        ...data,
        screenId: req.params.id,
        ...(data.validFrom && { validFrom: new Date(data.validFrom) }),
        ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
      },
    });
    res.status(201).json({ success: true, data: { slide } });
  },
);

// PATCH /digital-signage/slides/:slideId
router.patch(
  "/slides/:slideId",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const slide = await prisma.digitalSignageSlide.findUniqueOrThrow({
      where: { id: req.params.slideId },
      include: { screen: true },
    });
    await ensureMembership(req.user!.userId, req.user!.role, slide.screen.condominiumId);
    const data = slideSchema.partial().parse(req.body);
    const updated = await prisma.digitalSignageSlide.update({
      where: { id: req.params.slideId },
      data: {
        ...data,
        ...(data.validFrom && { validFrom: new Date(data.validFrom) }),
        ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
      },
    });
    res.json({ success: true, data: { slide: updated } });
  },
);

// DELETE /digital-signage/slides/:slideId
router.delete(
  "/slides/:slideId",
  authorize(...MGMT),
  async (req: Request, res: Response) => {
    const slide = await prisma.digitalSignageSlide.findUniqueOrThrow({
      where: { id: req.params.slideId },
      include: { screen: true },
    });
    await ensureMembership(req.user!.userId, req.user!.role, slide.screen.condominiumId);
    await prisma.digitalSignageSlide.delete({ where: { id: req.params.slideId } });
    res.json({ success: true, message: "Slide removido" });
  },
);

export default router;
