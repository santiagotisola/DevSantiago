import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { z } from "zod";
import { serviceProviderService } from "./serviceProvider.service";

const router = Router();
router.use(authenticate);

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
  async (req: Request, res: Response) => {
    const approved =
      req.query.approved === "true"
        ? true
        : req.query.approved === "false"
          ? false
          : undefined;
    const providers = await serviceProviderService.listByCondominium(
      req.params.condominiumId,
      { approved },
    );
    res.json({ success: true, data: { providers } });
  },
);

router.post(
  "/",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(schema, req.body);
    const provider = await serviceProviderService.create(data, req.user!);
    res.status(201).json({ success: true, data: { provider } });
  },
);

router.put(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const data = validateRequest(schema.partial(), req.body);
    const provider = await serviceProviderService.update(
      req.params.id,
      data,
      req.user!,
    );
    res.json({ success: true, data: { provider } });
  },
);

router.patch(
  "/:id/approve",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const provider = await serviceProviderService.approve(
      req.params.id,
      req.user!,
    );
    res.json({ success: true, data: { provider } });
  },
);

router.delete(
  "/:id",
  authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    await serviceProviderService.delete(req.params.id, req.user!);
    res.json({ success: true });
  },
);

export default router;
