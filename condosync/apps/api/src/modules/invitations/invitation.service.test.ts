import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { invitationService, __internal } from './invitation.service';
import { prismaMock } from '../../test/setup';
import { BadRequestError, NotFoundError, ConflictError } from '../../middleware/errorHandler';

vi.mock('../../config/mail', () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }));

const fixedNow = new Date('2026-05-09T20:00:00Z').getTime();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
});

describe('invitationService.create', () => {
  it('cria convite novo quando não há pendente para o mesmo email/condo/role', async () => {
    prismaMock.condominium.findUnique.mockResolvedValue({
      id: 'condo-1',
      name: 'Residencial X',
      isActive: true,
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'inviter-1', name: 'Ana' } as any);
    prismaMock.unit.findFirst.mockResolvedValue({ id: 'unit-1' } as any);
    prismaMock.invitation.findFirst.mockResolvedValue(null);
    prismaMock.invitation.create.mockResolvedValue({
      id: 'inv-1',
      expiresAt: new Date(fixedNow + 72 * 3600 * 1000),
    } as any);

    const result = await invitationService.create({
      email: 'Morador@Test.com',
      role: UserRole.RESIDENT,
      condominiumId: 'condo-1',
      unitId: 'unit-1',
      invitedById: 'inviter-1',
    });

    expect(result.invitation.id).toBe('inv-1');
    expect(prismaMock.invitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'morador@test.com', // normalizado em lowercase
          role: UserRole.RESIDENT,
          unitId: 'unit-1',
        }),
      }),
    );
  });

  it('rejeita convite de RESIDENT sem unitId', async () => {
    prismaMock.condominium.findUnique.mockResolvedValue({
      id: 'condo-1',
      name: 'X',
      isActive: true,
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'inviter-1', name: 'Ana' } as any);

    await expect(
      invitationService.create({
        email: 'a@b.com',
        role: UserRole.RESIDENT,
        condominiumId: 'condo-1',
        invitedById: 'inviter-1',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejeita criação em condomínio inativo', async () => {
    prismaMock.condominium.findUnique.mockResolvedValue({
      id: 'condo-1',
      name: 'X',
      isActive: false,
    } as any);

    await expect(
      invitationService.create({
        email: 'a@b.com',
        role: UserRole.SYNDIC,
        condominiumId: 'condo-1',
        invitedById: 'inviter-1',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('reaproveita convite pendente existente (regenera token) e respeita rate-limit', async () => {
    prismaMock.condominium.findUnique.mockResolvedValue({
      id: 'condo-1',
      name: 'X',
      isActive: true,
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'inviter-1', name: 'Ana' } as any);
    prismaMock.unit.findFirst.mockResolvedValue({ id: 'unit-1' } as any);

    // Convite enviado há 1 minuto — rate-limit deveria barrar (limite 3/h = 1 a cada 20min)
    prismaMock.invitation.findFirst.mockResolvedValue({
      id: 'inv-old',
      email: 'a@b.com',
      sendCount: 1,
      lastSentAt: new Date(fixedNow - 60 * 1000),
    } as any);

    await expect(
      invitationService.create({
        email: 'a@b.com',
        role: UserRole.RESIDENT,
        condominiumId: 'condo-1',
        unitId: 'unit-1',
        invitedById: 'inviter-1',
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('invitationService.previewByToken', () => {
  it('rejeita token desconhecido', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    await expect(invitationService.previewByToken('inexistente')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('rejeita convite já aceito', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      email: 'a@b.com',
      name: 'A',
      role: UserRole.RESIDENT,
      condominium: { id: 'c1', name: 'X' },
      unit: null,
      invitedBy: { name: 'Síndico' },
      expiresAt: new Date(fixedNow + 3600 * 1000),
      acceptedAt: new Date(fixedNow - 1000),
      revokedAt: null,
    } as any);
    await expect(invitationService.previewByToken('token-x')).rejects.toThrow(BadRequestError);
  });

  it('rejeita convite expirado', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      email: 'a@b.com',
      name: 'A',
      role: UserRole.RESIDENT,
      condominium: { id: 'c1', name: 'X' },
      unit: null,
      invitedBy: { name: 'S' },
      expiresAt: new Date(fixedNow - 1000),
      acceptedAt: null,
      revokedAt: null,
    } as any);
    await expect(invitationService.previewByToken('token-x')).rejects.toThrow(BadRequestError);
  });

  it('retorna view pública para convite pendente válido', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      email: 'a@b.com',
      name: 'Ana',
      role: UserRole.RESIDENT,
      condominium: { id: 'c1', name: 'Residencial X' },
      unit: { id: 'u1', identifier: '101', block: 'A' },
      invitedBy: { name: 'Síndico Carlos' },
      expiresAt: new Date(fixedNow + 3600 * 1000),
      acceptedAt: null,
      revokedAt: null,
    } as any);
    prismaMock.user.findUnique.mockResolvedValue(null);

    const view = await invitationService.previewByToken('token-x');
    expect(view).toMatchObject({
      email: 'a@b.com',
      condominium: { name: 'Residencial X' },
      unit: { identifier: '101', block: 'A' },
      alreadyHasAccount: false,
      inviterName: 'Síndico Carlos',
    });
  });
});

describe('invitationService.accept', () => {
  function setupTx({ invitation, user }: { invitation: any; user: any | null }) {
    const txMock = {
      invitation: {
        findUnique: vi.fn().mockResolvedValue(invitation),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
        create: vi.fn().mockResolvedValue({ id: 'user-new' }),
        update: vi.fn().mockResolvedValue({ id: user?.id ?? 'user-new' }),
      },
      condominiumUser: { upsert: vi.fn().mockResolvedValue({}) },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(txMock));
    return txMock;
  }

  it('aceita convite criando User novo e CondominiumUser', async () => {
    const tx = setupTx({
      invitation: {
        id: 'inv-1',
        email: 'a@b.com',
        cpf: null,
        phone: null,
        name: 'A',
        role: UserRole.RESIDENT,
        condominiumId: 'c1',
        unitId: 'u1',
        condominium: { isActive: true },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: new Date(fixedNow + 3600 * 1000),
      },
      user: null,
    });

    const result = await invitationService.accept({
      token: 'token-x',
      password: 'StrongPass@123',
    });

    expect(result.userId).toBe('user-new');
    expect(tx.user.create).toHaveBeenCalled();
    expect(tx.condominiumUser.upsert).toHaveBeenCalled();
    expect(tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ acceptedById: 'user-new' }) }),
    );
  });

  it('atualiza senha quando usuário já existe pelo email', async () => {
    const tx = setupTx({
      invitation: {
        id: 'inv-1',
        email: 'existing@b.com',
        cpf: null,
        phone: null,
        name: 'E',
        role: UserRole.SYNDIC,
        condominiumId: 'c1',
        unitId: null,
        condominium: { isActive: true },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: new Date(fixedNow + 3600 * 1000),
      },
      user: { id: 'user-existing' },
    });

    const result = await invitationService.accept({
      token: 'token-x',
      password: 'StrongPass@123',
    });

    expect(result.userId).toBe('user-existing');
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-existing' } }),
    );
  });

  it('rejeita aceite de convite revogado', async () => {
    setupTx({
      invitation: {
        id: 'inv-1',
        email: 'a@b.com',
        condominium: { isActive: true },
        acceptedAt: null,
        revokedAt: new Date(fixedNow - 1000),
        expiresAt: new Date(fixedNow + 3600 * 1000),
        role: UserRole.RESIDENT,
        condominiumId: 'c1',
        unitId: 'u1',
      },
      user: null,
    });
    await expect(
      invitationService.accept({ token: 'x', password: 'StrongPass@123' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejeita aceite duplicado (já aceito)', async () => {
    setupTx({
      invitation: {
        id: 'inv-1',
        email: 'a@b.com',
        condominium: { isActive: true },
        acceptedAt: new Date(fixedNow - 1000),
        revokedAt: null,
        expiresAt: new Date(fixedNow + 3600 * 1000),
        role: UserRole.RESIDENT,
        condominiumId: 'c1',
        unitId: 'u1',
      },
      user: null,
    });
    await expect(
      invitationService.accept({ token: 'x', password: 'StrongPass@123' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('rejeita aceite com token desconhecido', async () => {
    setupTx({ invitation: null, user: null });
    await expect(
      invitationService.accept({ token: 'x', password: 'StrongPass@123' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('__internal.hashToken', () => {
  it('produz hash sha256 determinístico do mesmo token', () => {
    const a = __internal.hashToken('alpha');
    const b = __internal.hashToken('alpha');
    const c = __internal.hashToken('beta');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
