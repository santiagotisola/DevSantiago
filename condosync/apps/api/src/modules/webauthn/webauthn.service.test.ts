import { describe, expect, it, beforeEach, vi } from 'vitest';
import { prismaMock } from '../../test/setup';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../middleware/errorHandler';

// Mock simplewebauthn (lib externa de crypto) — só validamos orquestração.
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

// Mock redis (challenge store)
vi.mock('../../config/redis', () => ({
  redis: {
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  },
}));

// Mock logger
vi.mock('../../config/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock env (FRONTEND_URL + WebAuthn config)
vi.mock('../../config/env', () => ({
  env: {
    FRONTEND_URL: 'https://app.condosync.test',
    WEBAUTHN_RP_ID: undefined,
    WEBAUTHN_ORIGIN: undefined,
    WEBAUTHN_RP_NAME: 'CondoSync',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

import {
  generateRegistrationOptions as libGenReg,
  verifyRegistrationResponse as libVerifyReg,
  generateAuthenticationOptions as libGenAuth,
  verifyAuthenticationResponse as libVerifyAuth,
} from '@simplewebauthn/server';
import { redis } from '../../config/redis';
import { webauthnService } from './webauthn.service';

describe('webauthnService', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findUniqueOrThrow.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.webAuthnCredential.findUnique.mockReset();
    prismaMock.webAuthnCredential.findMany.mockReset();
    prismaMock.webAuthnCredential.create.mockReset();
    prismaMock.webAuthnCredential.update.mockReset();
    prismaMock.webAuthnCredential.deleteMany.mockReset();
    prismaMock.refreshToken.create.mockReset();
    (libGenReg as any).mockReset();
    (libVerifyReg as any).mockReset();
    (libGenAuth as any).mockReset();
    (libVerifyAuth as any).mockReset();
    (redis.set as any).mockReset();
    (redis.get as any).mockReset();
    (redis.del as any).mockReset();
    (redis.set as any).mockResolvedValue('OK');
  });

  describe('generateRegistrationOptions', () => {
    it('NotFoundError quando user não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        webauthnService.generateRegistrationOptions('u-x'),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(libGenReg).not.toHaveBeenCalled();
    });

    it('user existente: chama lib com excludeCredentials das credenciais existentes e salva challenge', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'a@b.com',
        name: 'Alice',
      } as any);
      prismaMock.webAuthnCredential.findMany.mockResolvedValue([
        { credentialId: 'cred-A', transports: ['internal'] },
        { credentialId: 'cred-B', transports: ['usb'] },
      ] as any);
      (libGenReg as any).mockResolvedValue({ challenge: 'chal-123' });

      await webauthnService.generateRegistrationOptions('u-1');

      const callArg: any = (libGenReg as any).mock.calls[0]![0];
      expect(callArg.rpID).toBe('app.condosync.test'); // derivado de FRONTEND_URL
      expect(callArg.userName).toBe('a@b.com');
      expect(callArg.userDisplayName).toBe('Alice');
      expect(callArg.excludeCredentials).toEqual([
        { id: 'cred-A', transports: ['internal'] },
        { id: 'cred-B', transports: ['usb'] },
      ]);
      expect(redis.set).toHaveBeenCalledWith(
        'webauthn:register:u-1',
        'chal-123',
        'EX',
        300,
      );
    });
  });

  describe('verifyRegistration', () => {
    it('BadRequest quando challenge ausente/expirada no redis', async () => {
      (redis.get as any).mockResolvedValue(null);
      await expect(
        webauthnService.verifyRegistration('u-1', {} as any),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(libVerifyReg).not.toHaveBeenCalled();
    });

    it('consome challenge (get + del) antes de verificar', async () => {
      (redis.get as any).mockResolvedValue('chal-saved');
      (libVerifyReg as any).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-new',
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
            transports: ['internal'],
          },
          credentialDeviceType: 'singleDevice',
        },
      });
      prismaMock.webAuthnCredential.create.mockResolvedValue({} as any);
      await webauthnService.verifyRegistration('u-1', {} as any);
      expect(redis.get).toHaveBeenCalledWith('webauthn:register:u-1');
      expect(redis.del).toHaveBeenCalledWith('webauthn:register:u-1');
    });

    it('BadRequest quando lib retorna verified=false', async () => {
      (redis.get as any).mockResolvedValue('chal');
      (libVerifyReg as any).mockResolvedValue({ verified: false });
      await expect(
        webauthnService.verifyRegistration('u-1', {} as any),
      ).rejects.toBeInstanceOf(BadRequestError);
      expect(prismaMock.webAuthnCredential.create).not.toHaveBeenCalled();
    });

    it('sucesso: persiste credencial com deviceName fornecido', async () => {
      (redis.get as any).mockResolvedValue('chal');
      (libVerifyReg as any).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-id',
            publicKey: new Uint8Array([9]),
            counter: 42,
            transports: ['hybrid'],
          },
          credentialDeviceType: 'multiDevice',
        },
      });
      prismaMock.webAuthnCredential.create.mockResolvedValue({} as any);

      const result = await webauthnService.verifyRegistration(
        'u-1',
        {} as any,
        'iPhone do João',
      );

      expect(result).toEqual({ verified: true });
      const callArg: any =
        prismaMock.webAuthnCredential.create.mock.calls[0]![0];
      expect(callArg.data).toMatchObject({
        userId: 'u-1',
        credentialId: 'cred-id',
        counter: 42,
        transports: ['hybrid'],
        deviceName: 'iPhone do João',
      });
      expect(callArg.data.publicKey).toBeInstanceOf(Buffer);
    });

    it('fallback de deviceName para credentialDeviceType quando não fornecido', async () => {
      (redis.get as any).mockResolvedValue('chal');
      (libVerifyReg as any).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-id',
            publicKey: new Uint8Array(),
            counter: 0,
          },
          credentialDeviceType: 'singleDevice',
        },
      });
      prismaMock.webAuthnCredential.create.mockResolvedValue({} as any);
      await webauthnService.verifyRegistration('u-1', {} as any);
      const callArg: any =
        prismaMock.webAuthnCredential.create.mock.calls[0]![0];
      expect(callArg.data.deviceName).toBe('singleDevice');
      expect(callArg.data.transports).toEqual([]);
    });
  });

  describe('deleteCredential', () => {
    it('NotFound quando count=0 (não existe ou não pertence ao user)', async () => {
      prismaMock.webAuthnCredential.deleteMany.mockResolvedValue({
        count: 0,
      } as any);
      await expect(
        webauthnService.deleteCredential('u-1', 'cred-x'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('deleta filtrando por id+userId (impede cross-user)', async () => {
      prismaMock.webAuthnCredential.deleteMany.mockResolvedValue({
        count: 1,
      } as any);
      await webauthnService.deleteCredential('u-1', 'cred-pk');
      expect(prismaMock.webAuthnCredential.deleteMany).toHaveBeenCalledWith({
        where: { id: 'cred-pk', userId: 'u-1' },
      });
    });
  });

  describe('generateAuthenticationOptions — discovery vs usernameless', () => {
    beforeEach(() => {
      (libGenAuth as any).mockResolvedValue({ challenge: 'chal-auth' });
    });

    it('sem identifier: bucket _anon, sem allowCredentials', async () => {
      await webauthnService.generateAuthenticationOptions();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      const callArg: any = (libGenAuth as any).mock.calls[0]![0];
      expect(callArg.allowCredentials).toBeUndefined();
      expect(redis.set).toHaveBeenCalledWith(
        'webauthn:login:_anon',
        'chal-auth',
        'EX',
        300,
      );
    });

    it('identifier email: busca por email lowercase e popula allowCredentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' } as any);
      prismaMock.webAuthnCredential.findMany.mockResolvedValue([
        { credentialId: 'c-1', transports: ['internal'] },
      ] as any);
      await webauthnService.generateAuthenticationOptions('Foo@BAR.com  ');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'foo@bar.com' },
        select: { id: true },
      });
      const callArg: any = (libGenAuth as any).mock.calls[0]![0];
      expect(callArg.allowCredentials).toEqual([
        { id: 'c-1', transports: ['internal'] },
      ]);
      expect(redis.set).toHaveBeenCalledWith(
        'webauthn:login:u-1',
        'chal-auth',
        'EX',
        300,
      );
    });

    it('identifier CPF: remove não-dígitos antes de buscar', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' } as any);
      prismaMock.webAuthnCredential.findMany.mockResolvedValue([] as any);
      await webauthnService.generateAuthenticationOptions('123.456.789-00');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { cpf: '12345678900' },
        select: { id: true },
      });
    });

    it('resposta neutra: identifier desconhecido não vaza existência (não chama findMany, não falha)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await webauthnService.generateAuthenticationOptions('unknown@x.com');
      expect(prismaMock.webAuthnCredential.findMany).not.toHaveBeenCalled();
      const callArg: any = (libGenAuth as any).mock.calls[0]![0];
      expect(callArg.allowCredentials).toBeUndefined();
      expect(redis.set).toHaveBeenCalledWith(
        'webauthn:login:_anon',
        'chal-auth',
        'EX',
        300,
      );
    });
  });

  describe('verifyAuthentication', () => {
    const response: any = { id: 'cred-id' };

    function mockBaseCredential(overrides: any = {}) {
      prismaMock.webAuthnCredential.findUnique.mockResolvedValue({
        id: 'pk-1',
        credentialId: 'cred-id',
        userId: 'u-1',
        publicKey: Buffer.from([1, 2]),
        counter: 1,
        transports: ['internal'],
        user: { id: 'u-1', role: 'RESIDENT', name: 'Alice', isActive: true },
        ...overrides,
      } as any);
    }

    it('Unauthorized quando credentialId não reconhecido', async () => {
      prismaMock.webAuthnCredential.findUnique.mockResolvedValue(null);
      await expect(
        webauthnService.verifyAuthentication(response),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('Unauthorized quando conta desativada', async () => {
      mockBaseCredential({
        user: { id: 'u-1', role: 'RESIDENT', name: 'A', isActive: false },
      });
      await expect(
        webauthnService.verifyAuthentication(response),
      ).rejects.toThrow('Conta desativada');
    });

    it('BadRequest quando challenge ausente (nem userId nem _anon)', async () => {
      mockBaseCredential();
      (redis.get as any).mockResolvedValue(null);
      await expect(
        webauthnService.verifyAuthentication(response),
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('Unauthorized quando lib throws durante verifyAuthenticationResponse', async () => {
      mockBaseCredential();
      (redis.get as any).mockResolvedValueOnce('chal-saved');
      (libVerifyAuth as any).mockRejectedValue(new Error('signature inválida'));
      await expect(
        webauthnService.verifyAuthentication(response),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      // Counter NÃO é atualizado em falha
      expect(prismaMock.webAuthnCredential.update).not.toHaveBeenCalled();
    });

    it('Unauthorized quando lib retorna verified=false', async () => {
      mockBaseCredential();
      (redis.get as any).mockResolvedValueOnce('chal-saved');
      (libVerifyAuth as any).mockResolvedValue({ verified: false });
      await expect(
        webauthnService.verifyAuthentication(response),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(prismaMock.webAuthnCredential.update).not.toHaveBeenCalled();
    });

    it('sucesso: atualiza counter+lastUsedAt, lastLoginAt, persiste refreshToken e retorna user+tokens', async () => {
      mockBaseCredential();
      // 1ª chamada de redis.get tenta userId → tem; 2ª chamada (fallback _anon) não acontece.
      (redis.get as any).mockResolvedValueOnce('chal-saved');
      (libVerifyAuth as any).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 42 },
      });
      prismaMock.webAuthnCredential.update.mockResolvedValue({} as any);
      prismaMock.refreshToken.create.mockResolvedValue({} as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-1',
        name: 'Alice',
        email: 'a@b.com',
        role: 'RESIDENT',
        isActive: true,
      } as any);

      const result = await webauthnService.verifyAuthentication(response);

      expect(prismaMock.webAuthnCredential.update).toHaveBeenCalledWith({
        where: { id: 'pk-1' },
        data: {
          counter: 42,
          lastUsedAt: expect.any(Date),
        },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user.id).toBe('u-1');
    });

    it('usernameless: cai no fallback _anon quando bucket do userId está vazio', async () => {
      mockBaseCredential();
      (redis.get as any)
        .mockResolvedValueOnce(null) // bucket u-1
        .mockResolvedValueOnce('chal-anon'); // bucket _anon
      (libVerifyAuth as any).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 1 },
      });
      prismaMock.webAuthnCredential.update.mockResolvedValue({} as any);
      prismaMock.refreshToken.create.mockResolvedValue({} as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u-1',
      } as any);

      const result = await webauthnService.verifyAuthentication(response);
      expect(result.accessToken).toBeDefined();
      // 2 buckets consultados (u-1 e _anon), e 1 del do _anon
      expect((redis.get as any).mock.calls).toEqual([
        ['webauthn:login:u-1'],
        ['webauthn:login:_anon'],
      ]);
    });
  });
});
