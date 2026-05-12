import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../test/setup';
import { lgpdService } from './lgpd.service';

vi.mock('../audit/audit.service', () => ({
  auditService: { write: vi.fn().mockResolvedValue(undefined) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lgpdService.getCurrent', () => {
  it('retorna versão em vigor mais recente', async () => {
    prismaMock.termsVersion.findFirst.mockResolvedValue({
      id: 'v1',
      kind: 'terms_of_use',
      version: '1.0',
    } as any);
    const r = await lgpdService.getCurrent('terms_of_use');
    expect(r.id).toBe('v1');
    const args = prismaMock.termsVersion.findFirst.mock.calls[0][0] as any;
    expect(args.where.kind).toBe('terms_of_use');
    expect(args.orderBy.effectiveAt).toBe('desc');
  });

  it('lança NotFoundError quando não há versão em vigor', async () => {
    prismaMock.termsVersion.findFirst.mockResolvedValue(null);
    await expect(lgpdService.getCurrent('privacy_policy')).rejects.toThrow();
  });
});

describe('lgpdService.accept', () => {
  it('upsert idempotente + audit', async () => {
    prismaMock.termsVersion.findUnique.mockResolvedValue({
      id: 'v1',
      kind: 'terms_of_use',
      version: '1.0',
    } as any);
    prismaMock.termsAcceptance.upsert.mockResolvedValue({} as any);
    await lgpdService.accept('user-1', 'v1', '1.2.3.4', 'UA');
    const call = prismaMock.termsAcceptance.upsert.mock.calls[0][0] as any;
    expect(call.where).toEqual({ userId_termsVersionId: { userId: 'user-1', termsVersionId: 'v1' } });
    expect(call.update).toEqual({});
    expect(call.create.ipAddress).toBe('1.2.3.4');
  });
});

describe('lgpdService.acceptanceStatus', () => {
  it('retorna missing para versão não aceita', async () => {
    prismaMock.termsVersion.findFirst.mockImplementation(((args: any) => {
      if (args.where.kind === 'terms_of_use') {
        return Promise.resolve({ id: 'v1', kind: 'terms_of_use', version: '1.0' });
      }
      return Promise.resolve({ id: 'v2', kind: 'privacy_policy', version: '1.0' });
    }) as any);
    prismaMock.termsAcceptance.findMany.mockResolvedValue([
      { termsVersionId: 'v1', acceptedAt: new Date() },
    ] as any);

    const r = await lgpdService.acceptanceStatus('user-1');
    expect(r.terms?.accepted).toBe(true);
    expect(r.privacy?.accepted).toBe(false);
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0].kind).toBe('privacy_policy');
  });
});

describe('lgpdService.anonymize', () => {
  it('gera bcrypt hash válido (não literal inválido)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
    } as any);
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        user: { update: vi.fn().mockResolvedValue({}) },
        refreshToken: { deleteMany: vi.fn().mockResolvedValue({}) },
        passwordReset: { deleteMany: vi.fn().mockResolvedValue({}) },
        pushSubscription: { deleteMany: vi.fn().mockResolvedValue({}) },
        webAuthnCredential: { deleteMany: vi.fn().mockResolvedValue({}) },
      }),
    );
    // Capturar o user.update do tx
    let passwordHashWritten: string | undefined;
    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        user: {
          update: vi.fn(async (args: any) => {
            passwordHashWritten = args.data.passwordHash;
            return {};
          }),
        },
        refreshToken: { deleteMany: vi.fn().mockResolvedValue({}) },
        passwordReset: { deleteMany: vi.fn().mockResolvedValue({}) },
        pushSubscription: { deleteMany: vi.fn().mockResolvedValue({}) },
        webAuthnCredential: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });

    await lgpdService.anonymize('u1', 'actor');
    expect(passwordHashWritten).toBeDefined();
    // bcrypt $2b$ ou $2a$ format
    expect(passwordHashWritten).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });
});
