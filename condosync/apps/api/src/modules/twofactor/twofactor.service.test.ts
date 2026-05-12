import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticator } from 'otplib';
import { prismaMock } from '../../test/setup';
import { twoFactorService } from './twofactor.service';

vi.mock('../audit/audit.service', () => ({
  auditService: { write: vi.fn().mockResolvedValue(undefined) },
}));

const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('twoFactorService', () => {
  describe('setup', () => {
    it('falha se usuário já tem 2FA habilitado', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        email: 'a@b.com',
        twoFactorEnabled: true,
      } as any);
      await expect(twoFactorService.setup(USER_ID)).rejects.toThrow(/já está habilitado/);
    });

    it('gera secret + otpauthUrl + qrDataUrl e persiste o secret', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        email: 'a@b.com',
        twoFactorEnabled: false,
      } as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      const r = await twoFactorService.setup(USER_ID);
      expect(r.secret).toBeTruthy();
      expect(r.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
      expect(r.qrDataUrl).toMatch(/^data:image\/png/);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { twoFactorSecret: r.secret },
      });
    });
  });

  describe('verifyAndEnable', () => {
    it('rejeita token inválido', async () => {
      const secret = authenticator.generateSecret();
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      } as any);
      await expect(
        twoFactorService.verifyAndEnable(USER_ID, '000000'),
      ).rejects.toThrow();
    });

    it('habilita 2FA e gera 10 backup codes únicos', async () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      } as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      const r = await twoFactorService.verifyAndEnable(USER_ID, token);
      expect(r.backupCodes).toHaveLength(10);
      expect(new Set(r.backupCodes).size).toBe(10);
      // formato XXXXX-XXXXX
      r.backupCodes.forEach((c) => expect(c).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/));
    });
  });

  describe('verifyLogin', () => {
    it('aceita TOTP válido', async () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: [],
      } as any);
      const r = await twoFactorService.verifyLogin(USER_ID, token);
      expect(r).toEqual({ ok: true, usedBackup: false });
    });

    it('rejeita TOTP inválido', async () => {
      const secret = authenticator.generateSecret();
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: [],
      } as any);
      const r = await twoFactorService.verifyLogin(USER_ID, '000000');
      expect(r.ok).toBe(false);
    });

    it('consome backup code (single-use)', async () => {
      const crypto = await import('node:crypto');
      const plain = 'ABCDE-FGHIJ';
      const hash = crypto.createHash('sha256').update(plain).digest('hex');
      const codes = [{ hash, usedAt: null }];
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'sec',
        twoFactorEnabled: true,
        twoFactorBackupCodes: codes,
      } as any);
      prismaMock.user.update.mockResolvedValue({} as any);

      const r = await twoFactorService.verifyLogin(USER_ID, plain);
      expect(r).toEqual({ ok: true, usedBackup: true });
      const call = prismaMock.user.update.mock.calls[0]?.[0] as any;
      const stored = call.data.twoFactorBackupCodes as Array<{ usedAt: string | null }>;
      expect(stored[0].usedAt).not.toBeNull();
    });

    it('rejeita backup code já usado', async () => {
      const crypto = await import('node:crypto');
      const plain = 'ABCDE-FGHIJ';
      const hash = crypto.createHash('sha256').update(plain).digest('hex');
      const codes = [{ hash, usedAt: new Date().toISOString() }];
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorSecret: 'sec',
        twoFactorEnabled: true,
        twoFactorBackupCodes: codes,
      } as any);
      const r = await twoFactorService.verifyLogin(USER_ID, plain);
      expect(r).toEqual({ ok: false, usedBackup: false });
    });
  });

  describe('status', () => {
    it('conta backup codes restantes corretamente', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorBackupCodes: [
          { hash: 'a', usedAt: null },
          { hash: 'b', usedAt: '2026-01-01' },
          { hash: 'c', usedAt: null },
        ],
      } as any);
      const s = await twoFactorService.status(USER_ID);
      expect(s).toEqual({
        enabled: true,
        backupCodesRemaining: 2,
        backupCodesTotal: 3,
      });
    });
  });
});
