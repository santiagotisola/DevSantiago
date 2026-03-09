import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError, UnauthorizedError, ConflictError } from '../../middleware/errorHandler';
import { JwtPayload } from '../../middleware/auth';
import type { UserRole } from '@prisma/client';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export class AuthService {
  private generateTokens(payload: JwtPayload) {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    });
    return { accessToken, refreshToken };
  }

  async register(data: RegisterDTO) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Este e-mail já está cadastrado');

    if (data.cpf) {
      const cpfExists = await prisma.user.findUnique({ where: { cpf: data.cpf } });
      if (cpfExists) throw new ConflictError('Este CPF já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(data.password, Number(env.BCRYPT_ROUNDS));

    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        role: 'RESIDENT' as UserRole,
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true,
      },
    });

    return { user };
  }

  async login(data: LoginDTO, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true, name: true, email: true, role: true,
        passwordHash: true, isActive: true, avatarUrl: true,
      },
    });

    if (!user) throw new UnauthorizedError('E-mail ou senha inválidos');
    if (!user.isActive) throw new UnauthorizedError('Conta desativada. Contate o suporte.');

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) throw new UnauthorizedError('E-mail ou senha inválidos');

    const payload: JwtPayload = { userId: user.id, role: user.role };
    const { accessToken, refreshToken } = this.generateTokens(payload);

    // Salvar refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    const payload: JwtPayload = { userId: decoded.userId, role: decoded.role };
    const tokens = this.generateTokens(payload);

    // Rotacionar refresh token
    await prisma.refreshToken.delete({ where: { token } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: decoded.userId, expiresAt },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Não revelar se o e-mail existe
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    await prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt },
    });

    // TODO: enviar e-mail com link de reset
    return { token }; // em produção, apenas enviar por e-mail
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await prisma.passwordReset.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
    });

    if (!reset) throw new AppError('Token inválido ou expirado', 400);

    const passwordHash = await bcrypt.hash(newPassword, Number(env.BCRYPT_ROUNDS));

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
      prisma.refreshToken.deleteMany({ where: { userId: reset.userId } }),
    ]);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Senha atual incorreta', 400);

    const passwordHash = await bcrypt.hash(newPassword, Number(env.BCRYPT_ROUNDS));
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}

export const authService = new AuthService();
