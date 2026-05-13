import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validateRequest } from "../../utils/validateRequest";
import { passwordSchema } from "../auth/auth.controller";
import { z } from "zod";
import { userService } from "./user.service";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorize("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const users = await userService.list({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ success: true, data: { users } });
  },
);

router.get("/:id", async (req: Request, res: Response) => {
  const user = await userService.findById(req.params.id, req.user!);
  res.json({ success: true, data: { user } });
});

router.put("/:id", async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  });
  const data = validateRequest(schema, req.body);
  const user = await userService.updateProfile(req.params.id, data, req.user!);
  res.json({ success: true, data: { user } });
});

router.patch(
  "/:id/reset-password",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const schema = z.object({ newPassword: passwordSchema });
    const { newPassword } = validateRequest(schema, req.body);
    await userService.resetPassword(req.params.id, newPassword, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.json({ success: true, message: "Senha redefinida com sucesso" });
  },
);

router.patch(
  "/:id/toggle-active",
  authorize("SUPER_ADMIN", "CONDOMINIUM_ADMIN"),
  async (req: Request, res: Response) => {
    const result = await userService.toggleActive(req.params.id, req.user!, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    });
    res.json({ success: true, data: result });
  },
);

export default router;
