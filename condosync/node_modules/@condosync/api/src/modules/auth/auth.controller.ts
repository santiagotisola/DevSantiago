import { Request, Response } from 'express';
import { authService } from './auth.service';
import { validateRequest } from '../../utils/validateRequest';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'A senha deve ter ao menos 1 maiúscula e 1 número'),
  phone: z.string().optional(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string() });
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export class AuthController {
  async register(req: Request, res: Response) {
    const data = validateRequest(registerSchema, req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  }

  async login(req: Request, res: Response) {
    const data = validateRequest(loginSchema, req.body);
    const result = await authService.login(data, req.ip);
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
