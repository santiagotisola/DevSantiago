import { Request, Response } from 'express';
import { authService } from './auth.service';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

// Política única de senha — usada por register, reset, change e
// pelo admin reset (/users/:id/reset-password).
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])/;
const PASSWORD_MIN = 8;
const PASSWORD_MSG =
  "A senha deve ter no mínimo 8 caracteres, 1 maiúscula e 1 número";
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, PASSWORD_MSG)
  .regex(PASSWORD_REGEX, PASSWORD_MSG);

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  phone: z.string().optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
});

// Aceita `identifier` (email ou CPF) ou `email` (compat). Pelo menos um precisa
// vir preenchido — preferimos `identifier` quando ambos chegam.
// Schema "input": valida; controller faz a normalização (transform num
// schema atrapalha tipagem do validateRequest, que assume input == output).
const loginInputSchema = z
  .object({
    identifier: z.string().min(1).max(100).optional(),
    email: z.string().min(1).max(100).optional(),
    password: z.string().min(1),
  })
  .refine((d) => !!(d.identifier || d.email), {
    message: "Informe e-mail ou CPF",
    path: ["identifier"],
  });

const refreshSchema = z.object({ refreshToken: z.string() });
const twoFASchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6).max(12),
});
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string(),
  newPassword: passwordSchema,
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export class AuthController {
  async register(req: Request, res: Response) {
    const data = validateRequest(registerSchema, req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  }

  async login(req: Request, res: Response) {
    const raw = validateRequest(loginInputSchema, req.body);
    const identifier = (raw.identifier ?? raw.email)!.trim();
    const result = await authService.login(
      { identifier, password: raw.password },
      req.ip,
      req.get('user-agent') ?? undefined,
    );
    res.json({ success: true, data: result });
  }

  async verify2FA(req: Request, res: Response) {
    const data = validateRequest(twoFASchema, req.body);
    const result = await authService.verify2FAChallenge(
      data.challengeToken,
      data.code,
    );
    res.json({ success: true, data: result });
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = validateRequest(refreshSchema, req.body);
    const tokens = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: tokens });
  }

  async logout(req: Request, res: Response) {
    const { refreshToken } = validateRequest(refreshSchema, req.body);
    await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  }

  async me(req: Request, res: Response) {
    const { prisma } = await import('../../config/prisma');
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, phone: true, cpf: true,
        avatarUrl: true, role: true, emailVerified: true, lastLoginAt: true,
        condominiumUsers: {
          where: { isActive: true },
          include: { condominium: { select: { id: true, name: true, logoUrl: true } } },
        },
      },
    });
    res.json({ success: true, data: { user } });
  }

  async requestPasswordReset(req: Request, res: Response) {
    const { email } = validateRequest(emailSchema, req.body);
    await authService.requestPasswordReset(email);
    res.json({ success: true, message: 'Se o e-mail existir, você receberá instruções de recuperação' });
  }

  async resetPassword(req: Request, res: Response) {
    const data = validateRequest(resetSchema, req.body);
    await authService.resetPassword(data.token, data.newPassword);
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  }

  async changePassword(req: Request, res: Response) {
    const data = validateRequest(changePasswordSchema, req.body);
    await authService.changePassword(req.user!.userId, data.currentPassword, data.newPassword);
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  }
}

export const authController = new AuthController();
