import { describe, expect, it, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { lostAndFoundService } from './lost-and-found.service';
import { ForbiddenError } from '../../middleware/errorHandler';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };

describe('LostAndFoundService', () => {
  beforeEach(() => {
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.lostAndFound.findUniqueOrThrow.mockReset();
    prismaMock.lostAndFound.findMany.mockReset();
    prismaMock.lostAndFound.count.mockReset();
    prismaMock.lostAndFound.create.mockReset();
    prismaMock.lostAndFound.update.mockReset();
    prismaMock.lostAndFound.delete.mockReset();
  });

  describe('list — paginação + multi-tenancy', () => {
    it('SUPER_ADMIN bypass + retorna paginação', async () => {
      prismaMock.lostAndFound.findMany.mockResolvedValue([{ id: 'l-1' }] as any);
      prismaMock.lostAndFound.count.mockResolvedValue(1);
      const result = await lostAndFoundService.list('c-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('admin com membership calcula skip a partir de page/limit', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.findMany.mockResolvedValue([] as any);
      prismaMock.lostAndFound.count.mockResolvedValue(0);
      await lostAndFoundService.list('c-1', admin, 3, 10);
      const arg: any = prismaMock.lostAndFound.findMany.mock.calls[0]![0];
      expect(arg.skip).toBe(20);
      expect(arg.take).toBe(10);
    });

    it('fail-closed: 403 sem membership antes de consultar itens', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(lostAndFoundService.list('c-x', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.lostAndFound.findMany).not.toHaveBeenCalled();
    });

    it('calcula totalPages corretamente para 25 itens com limit 10', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.findMany.mockResolvedValue([] as any);
      prismaMock.lostAndFound.count.mockResolvedValue(25);
      const result = await lostAndFoundService.list('c-1', admin, 1, 10);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getById — F1 IDOR fix', () => {
    it('SUPER_ADMIN bypass + retorna com createdBy.name', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValue({
        id: 'l-1',
        condominiumId: 'c-1',
      } as any);
      await lostAndFoundService.getById('l-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(lostAndFoundService.getById('l-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('admin com membership consegue ler o item', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        title: 'Chave',
      } as any);
      const result = await lostAndFoundService.getById('l-1', admin);
      expect(result.id).toBe('l-1');
    });
  });

  describe('create — conversão de datas', () => {
    it('converte foundDate e lostDate strings em Date', async () => {
      prismaMock.lostAndFound.create.mockResolvedValue({ id: 'l-new' } as any);
      await lostAndFoundService.create(
        {
          title: 'Carteira',
          category: 'documento',
          foundDate: '2026-05-10',
          lostDate: '2026-05-09',
        },
        admin.userId,
        'c-1',
      );
      const arg: any = prismaMock.lostAndFound.create.mock.calls[0]![0];
      expect(arg.data.foundDate).toBeInstanceOf(Date);
      expect(arg.data.lostDate).toBeInstanceOf(Date);
      expect(arg.data.condominiumId).toBe('c-1');
      expect(arg.data.createdById).toBe('admin-1');
    });

    it('datas ausentes ficam null (não undefined)', async () => {
      prismaMock.lostAndFound.create.mockResolvedValue({ id: 'l-new' } as any);
      await lostAndFoundService.create(
        { title: 'X', category: 'outro' },
        admin.userId,
        'c-1',
      );
      const arg: any = prismaMock.lostAndFound.create.mock.calls[0]![0];
      expect(arg.data.foundDate).toBeNull();
      expect(arg.data.lostDate).toBeNull();
    });
  });

  describe('update — F2 IDOR fix', () => {
    it('atualiza com returnedAt convertido para Date', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.update.mockResolvedValue({ id: 'l-1' } as any);
      await lostAndFoundService.update(
        'l-1',
        { status: 'RETURNED' as any, returnedAt: '2026-05-11T10:00:00Z' },
        admin,
      );
      const arg: any = prismaMock.lostAndFound.update.mock.calls[0]![0];
      expect(arg.data.returnedAt).toBeInstanceOf(Date);
    });

    it('returnedAt ausente fica undefined (mantém valor atual)', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.update.mockResolvedValue({} as any);
      await lostAndFoundService.update('l-1', { title: 'Atualizado' }, admin);
      const arg: any = prismaMock.lostAndFound.update.mock.calls[0]![0];
      expect(arg.data.returnedAt).toBeUndefined();
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        lostAndFoundService.update('l-1', { title: 'X' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.lostAndFound.update).not.toHaveBeenCalled();
    });
  });

  describe('delete — F3 IDOR fix', () => {
    it('deleta após guard', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.lostAndFound.delete.mockResolvedValue({} as any);
      await lostAndFoundService.delete('l-1', admin);
      expect(prismaMock.lostAndFound.delete).toHaveBeenCalledWith({
        where: { id: 'l-1' },
      });
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.lostAndFound.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'l-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(lostAndFoundService.delete('l-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(prismaMock.lostAndFound.delete).not.toHaveBeenCalled();
    });
  });
});
