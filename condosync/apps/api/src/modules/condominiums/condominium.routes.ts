import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { condominiumService } from "./condominium.service";

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(3),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v.length === 0 || v.length === 14,
      "CNPJ deve conter 14 dígitos",
    )
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  plan: z.string().min(1).max(40).optional(),
  maxUnits: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const condominiums = await condominiumService.list(req.user!);
  res.json({ success: true, data: { condominiums } });
});

router.post(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(createSchema, req.body);
    const condominium = await condominiumService.create(data);
    res.status(201).json({ success: true, data: { condominium } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const condominium = await condominiumService.findById(
    req.params.id,
    req.user!,
  );
  res.json({ success: true, data: { condominium } });
});

router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(updateSchema, req.body);
    const condominium = await condominiumService.update(
      req.params.id,
      data,
      req.user!,
    );
    res.json({ success: true, data: { condominium } });
  },
);

router.delete(
  "/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const result = await condominiumService.delete(req.params.id, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    if (!result.deleted) {
      const isForeignKey =
        Object.keys(result.blockers).length === 1 &&
        "foreignKey" in result.blockers;
      return res.status(409).json({
        success: false,
        message: isForeignKey
          ? "Condomínio possui registros vinculados que impedem a exclusão. Inative-o em vez de excluir."
          : "Condomínio possui vínculos e não pode ser excluído. Remova-os ou inative o condomínio.",
        data: { blockers: result.blockers },
      });
    }
    res.json({ success: true });
  },
);

router.patch(
  "/:id/plan",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      planSlug: z.string().min(1).max(40),
      maxUnits: z.number().int().positive().optional(),
    });
    const { planSlug, maxUnits } = validateRequest(schema, req.body);
    const condominium = await condominiumService.assignPlan(
      req.params.id,
      planSlug,
      maxUnits,
      req.user!,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] ?? null },
    );
    res.json({ success: true, data: { condominium } });
  },
);

router.post(
  "/:id/setup-admin",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });
    const data = validateRequest(schema, req.body);
    const { user, membership } = await condominiumService.setupAdmin(
      req.params.id,
      data,
    );
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        membership,
      },
    });
  },
);

router.post(
  "/:id/members",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.string().uuid(),
      role: z.nativeEnum(UserRole),
      unitId: z.string().uuid().optional(),
    });
    const data = validateRequest(schema, req.body);
    const member = await condominiumService.addMember(
      req.params.id,
      data,
      req.user!,
    );
    res.status(201).json({ success: true, data: { member } });
  },
);

router.get(
  "/:id/members",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "COUNCIL_MEMBER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const members = await condominiumService.listMembers(
      req.params.id,
      req.user!,
    );
    res.json({ success: true, data: { members } });
  },
);

router.delete(
  "/:id/members/:userId",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await condominiumService.removeMember(
      req.params.id,
      req.params.userId,
      req.user!,
    );
    res.json({ success: true });
  },
);

export default router;
