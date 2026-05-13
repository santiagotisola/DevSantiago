import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import {
  marketplaceService,
  MARKETPLACE_CATEGORIES,
} from "./marketplace.service";

const router = Router();
router.use(authenticate);

const partnerSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  category: z.enum(MARKETPLACE_CATEGORIES),
});

const offerSchema = z.object({
  partnerId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(2),
  discount: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  couponCode: z.string().optional(),
});

router.get("/partners", async (_req: Request, res: Response) => {
  const partners = await marketplaceService.listActivePartners();
  res.json({ success: true, data: partners });
});

router.get(
  "/partners/admin",
  authorize("SUPER_ADMIN"),
  async (_req: Request, res: Response) => {
    const partners = await marketplaceService.listAllPartnersAdmin();
    res.json({ success: true, data: partners });
  },
);

router.post(
  "/partners",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(partnerSchema, req.body);
    const partner = await marketplaceService.createPartner(data);
    res.status(201).json({ success: true, data: partner });
  },
);

router.put(
  "/partners/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(partnerSchema.partial(), req.body);
    const partner = await marketplaceService.updatePartner(req.params.id, data);
    res.json({ success: true, data: partner });
  },
);

router.patch(
  "/partners/:id/toggle",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const partner = await marketplaceService.togglePartnerActive(req.params.id);
    res.json({ success: true, data: partner });
  },
);

router.get("/offers", async (req: Request, res: Response) => {
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  const offers = await marketplaceService.listActiveOffers(category);
  res.json({ success: true, data: offers });
});

router.post(
  "/offers",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(offerSchema, req.body);
    const offer = await marketplaceService.createOffer(data);
    res.status(201).json({ success: true, data: offer });
  },
);

router.patch(
  "/offers/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({
      status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      discount: z.string().optional(),
      couponCode: z.string().optional(),
      validUntil: z.string().datetime().optional(),
    });
    const data = validateRequest(schema, req.body);
    const offer = await marketplaceService.updateOffer(req.params.id, data);
    res.json({ success: true, data: offer });
  },
);

router.delete(
  "/offers/:id",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await marketplaceService.deleteOffer(req.params.id);
    res.json({ success: true });
  },
);

router.get("/categories", async (_req: Request, res: Response) => {
  res.json({ success: true, data: marketplaceService.listCategories() });
});

export default router;
