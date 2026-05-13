import { describe, expect, it, beforeEach, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { userService } from './user.service';
import { ForbiddenError } from '../../middleware/errorHandler';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed-pw') },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: { write: vi.fn(async () => undefined) },
}));

import { auditService } from '../audit/audit.service';

const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };
const condoAdmin = { userId: 'ca-1', role: UserRole.CONDOMINIUM_ADMIN };
const resident = { userId: 'res-1', role: UserRole.RESIDENT };

describe('UserService', () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockReset();
    prismaMock.user.findUniqueOrThrow.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.refreshToken.deleteMany.mockReset();
    prismaMock.$transaction.mockReset();
    (auditService.write as any).mockReset();
  });

  describe('list — paginação', () => {
    it('default page=1 limit=50', async () => {
      prismaMock.user.findMany.mockResolvedValue([] as any);
      await userService.list();
      const arg: any = prismaMock.user.findMany.mock.calls[0]![0];
      expect(arg.take).toBe(50);
      expect(arg.skip).toBe(0);
    });

    it('page=3 limit=10 → skip=20', async () => {
      prismaMock.user.findMany.mockResolvedValue([] as any);
      await userService.list({ page: 3, limit: 10 });
      const arg: any = prismaMock.user.findMany.mock.calls[0]![0];
      expect(arg.take).toBe(10);
      expect(arg.skip).toBe(20);
    });
  });

  describe('findById — M1 (shared-condominium check)', () => {
    it('SUPER_ADMIN vê qualquer perfil sem shared check', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: 'x' } as any);
      await userService.findById('x', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('user vê o próprio perfil sem shared check', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: 'res-1' } as any);
      await userService.findById('res-1', resident);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('user vê perfil de outro do mesmo condomínio', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'shared' } as any);
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ id: 'other' } as any);
      await userService.findById('other', resident);
      expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalled();
    });

    it('fail-closed: 403 quando não compartilham condomínio', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(userService.findById('other', resident)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('user atualiza próprio perfil', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'res-1', name: 'Novo' } as any);
      const result = await userService.updateProfile('res-1', { name: 'Novo' }, resident);
      expect(result.name).toBe('Novo');
    });

    it('SUPER_ADMIN atualiza perfil de outro', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'x' } as any);
      await userService.updateProfile('x', { name: 'Y' }, superAdmin);
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    it('outro user tentando atualizar terceiro → 403', async () => {
      await expect(
        userService.updateProfile('other', { name: 'Y' }, resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword — M3', () => {
    it('SUPER_ADMIN redefine senha de qualquer usuário, invalida refresh tokens e audita', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ role: 'RESIDENT' } as any);
      prismaMock.$transaction.mockResolvedValue([{}, {}] as any);
      await userService.resetPassword('target-1', 'NewPass@123', superAdmin, {
        ipAddress: '1.2.3.4',
        userAgent: 'jest',
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESET_PASSWORD',
          entityId: 'target-1',
          userId: 'sa-1',
          ipAddress: '1.2.3.4',
        }),
      );
    });

    it('CONDOMINIUM_ADMIN não pode resetar senha de SUPER_ADMIN', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ role: 'SUPER_ADMIN' } as any);
      await expect(
        userService.resetPassword('sa-target', 'NewPass@123', condoAdmin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('CONDOMINIUM_ADMIN não pode resetar senha de outro CONDOMINIUM_ADMIN', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        role: 'CONDOMINIUM_ADMIN',
      } as any);
      await expect(
        userService.resetPassword('other-admin', 'NewPass@123', condoAdmin),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('CONDOMINIUM_ADMIN reseta senha de membro do próprio condomínio', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ role: 'RESIDENT' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'shared' } as any);
      prismaMock.$transaction.mockResolvedValue([{}, {}] as any);
      await userService.resetPassword('res-target', 'NewPass@123', condoAdmin);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(auditService.write).toHaveBeenCalled();
    });

    it('CONDOMINIUM_ADMIN bloqueado quando alvo não pertence ao seu condomínio', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({ role: 'RESIDENT' } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        userService.resetPassword('res-target', 'NewPass@123', condoAdmin),
      ).rejects.toThrow('Usuário não pertence ao seu condomínio');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('toggleActive — M2', () => {
    it('SUPER_ADMIN alterna isActive e audita', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: true,
        role: 'RESIDENT',
      } as any);
      prismaMock.user.update.mockResolvedValue({ isActive: false } as any);
      const result = await userService.toggleActive('target-1', superAdmin);
      expect(result.isActive).toBe(false);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'target-1' },
        data: { isActive: false },
      });
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEACTIVATE_USER' }),
      );
    });

    it('SUPER_ADMIN reativa usuário inativo (action = ACTIVATE_USER)', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: false,
        role: 'RESIDENT',
      } as any);
      prismaMock.user.update.mockResolvedValue({ isActive: true } as any);
      await userService.toggleActive('target-1', superAdmin);
      expect(auditService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTIVATE_USER' }),
      );
    });

    it('CONDOMINIUM_ADMIN não pode desativar SUPER_ADMIN', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: true,
        role: 'SUPER_ADMIN',
      } as any);
      await expect(
        userService.toggleActive('sa-target', condoAdmin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('CONDOMINIUM_ADMIN não pode desativar outro CONDOMINIUM_ADMIN', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: true,
        role: 'CONDOMINIUM_ADMIN',
      } as any);
      await expect(
        userService.toggleActive('other-admin', condoAdmin),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('CONDOMINIUM_ADMIN desativa membro do próprio condomínio', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: true,
        role: 'RESIDENT',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'shared' } as any);
      prismaMock.user.update.mockResolvedValue({ isActive: false } as any);
      await userService.toggleActive('res-target', condoAdmin);
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    it('CONDOMINIUM_ADMIN bloqueado quando alvo não compartilha condomínio', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        isActive: true,
        role: 'RESIDENT',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        userService.toggleActive('res-target', condoAdmin),
      ).rejects.toThrow('Usuário não pertence ao seu condomínio');
    });
  });
});
