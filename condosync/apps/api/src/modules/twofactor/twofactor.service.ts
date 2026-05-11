import crypto from 'node:crypto';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../middleware/errorHandler';

// Janela de tolerância para drift de relógio (1 = ±30s).
authenticator.options = { window: 1, step: 30 };

const ISSUER = 'CondoSync';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

interface BackupCodeRecord {
  hash: string;
  usedAt: string | null;
}

function hashCode(plain: string): string {
  return crypto.createHash('sha256').update(plain.trim()).digest('hex');
}

function generateBackupCode(): string {
  // 10 chars base32 (sem confusões I/O/0/1) — fácil de digitar
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    s += alphabet[crypto.randomInt(alphabet.length)];
  }
  // Inserir hífen no meio para legibilidade
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export const twoFactorService = {
  /**
   * Inicia o setup: gera secret e devolve o otpauth:// URL + dataURL do QR.
   * NÃO marca twoFactorEnabled ainda — só após /verify.
   */
  async setup(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundError('Usuário', userId);
    if (user.twoFactorEnabled) {
      throw new BadRequestError('2FA já está habilitado. Desative antes de re-configurar.');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Armazena o secret temporariamente; só vira "enabled" no verify.
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpauthUrl, qrDataUrl };
  },

  /**
   * Conclui o setup verificando o token TOTP. Gera backup codes únicos.
   * Retorna os backup codes em texto plano — única exibição.
   */
  async verifyAndEnable(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestError('Inicie o setup de 2FA antes de verificar.');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestError('2FA já está habilitado.');
    }

    const ok = authenticator.verify({ token: token.replace(/\s/g, ''), secret: user.twoFactorSecret });
    if (!ok) throw new UnauthorizedError('Código inválido. Verifique o app autenticador.');

    const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    const stored: BackupCodeRecord[] = plainCodes.map((c) => ({
      hash: hashCode(c),
      usedAt: null,
    }));

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: stored as any,
      },
    });

    return { backupCodes: plainCodes };
  },

  /**
   * Verifica um código TOTP normal OU backup code. Backup code é consumido
   * (marca usedAt). Usado no fluxo de login.
   */
  async verifyLogin(userId: string, code: string): Promise<{ ok: boolean; usedBackup: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorBackupCodes: true, twoFactorEnabled: true },
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestError('2FA não está habilitado para este usuário.');
    }

    const clean = code.trim().replace(/\s/g, '');

    // 1. TOTP normal (6 dígitos numéricos)
    if (/^\d{6}$/.test(clean)) {
      const ok = authenticator.verify({ token: clean, secret: user.twoFactorSecret });
      return { ok, usedBackup: false };
    }

    // 2. Backup code (formato XXXXX-XXXXX)
    const codes = (user.twoFactorBackupCodes ?? []) as unknown as BackupCodeRecord[];
    const target = hashCode(clean.toUpperCase());
    const idx = codes.findIndex((c) => c.hash === target && !c.usedAt);
    if (idx === -1) return { ok: false, usedBackup: false };

    codes[idx].usedAt = new Date().toISOString();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: codes as any },
    });
    return { ok: true, usedBackup: true };
  },

  /**
   * Regenera os 10 códigos de backup. Útil se o usuário perdeu o set anterior.
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestError('Habilite 2FA antes de regenerar códigos.');
    }
    const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    const stored: BackupCodeRecord[] = plainCodes.map((c) => ({ hash: hashCode(c), usedAt: null }));
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes: stored as any },
    });
    return plainCodes;
  },

  /**
   * Desabilita 2FA. Exige token TOTP ou senha — passamos um TOTP válido aqui;
   * a rota pede confirmação. Apaga secret + backup codes.
   */
  async disable(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true },
    });
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestError('2FA não está habilitado.');
    }
    const verify = await this.verifyLogin(userId, code);
    if (!verify.ok) throw new UnauthorizedError('Código inválido.');

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null as any,
      },
    });
  },

  /**
   * Status atual do 2FA para o usuário (sem expor secret nem hashes).
   */
  async status(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });
    if (!user) throw new NotFoundError('Usuário', userId);
    const codes = (user.twoFactorBackupCodes ?? []) as unknown as BackupCodeRecord[];
    return {
      enabled: user.twoFactorEnabled,
      backupCodesRemaining: codes.filter((c) => !c.usedAt).length,
      backupCodesTotal: codes.length,
    };
  },
};

// Re-export pra usar no auth.service (login com 2FA)
export const __forAuth = {
  /** Verificação rápida usada no fluxo de login (não consome backup em GET). */
  async hasEnabled(userId: string): Promise<boolean> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return !!u?.twoFactorEnabled;
  },
};
