import { describe, it, expect, vi } from 'vitest';
import { authorizeCondominium } from './auth';
import { ForbiddenError, UnauthorizedError } from './errorHandler';
import { prismaMock } from '../test/setup';
import { UserRole } from '@prisma/client';

describe('authorizeCondominium', () => {
  it('lanca UnauthorizedError quando req.user nao existe', async () => {
    const req: any = { params: { condominiumId: 'condo-1' }, body: {}, query: {} };
    const next = vi.fn();

    await expect(authorizeCondominium(req, {} as any, next)).rejects.toThrow(
      UnauthorizedError,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('permite SUPER_ADMIN sem consultar membership', async () => {
    const req: any = {
      user: { userId: 'u1', role: UserRole.SUPER_ADMIN },
      params: { condominiumId: 'condo-1' },
      body: {},
      query: {},
    };
    const next = vi.fn();

    await authorizeCondominium(req, {} as any, next);

    expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('injeta escopo quando membership ativo existe', async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      id: 'm1',
      role: UserRole.SYNDIC,
    } as any);

    const req: any = {
      user: { userId: 'u1', role: UserRole.RESIDENT },
      params: { condominiumId: 'condo-1' },
      body: {},
      query: {},
    };
    const next = vi.fn();

    await authorizeCondominium(req, {} as any, next);

    expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', condominiumId: 'condo-1', isActive: true },
    });
    expect(req.user.condominiumId).toBe('condo-1');
    expect(req.user.role).toBe(UserRole.SYNDIC);
    expect(next).toHaveBeenCalledOnce();
  });

  it('lanca ForbiddenError quando usuario nao pertence ao condominio', async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    const req: any = {
      user: { userId: 'u1', role: UserRole.RESIDENT },
      params: { condominiumId: 'condo-2' },
      body: {},
      query: {},
    };
    const next = vi.fn();

    await expect(authorizeCondominium(req, {} as any, next)).rejects.toThrow(
      ForbiddenError,
    );
    expect(next).not.toHaveBeenCalled();
  });
});
