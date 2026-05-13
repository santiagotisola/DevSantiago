import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AssemblyStatus, UserRole } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { assemblyService } from './assembly.service';
import {
  AppError,
  ForbiddenError,
} from '../../middleware/errorHandler';

vi.mock('../../notifications/notification.service', () => ({
  NotificationService: { enqueue: vi.fn(async () => undefined) },
}));

import { NotificationService } from '../../notifications/notification.service';

const admin = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const superAdmin = { userId: 'sa-1', role: UserRole.SUPER_ADMIN };
const resident = { userId: 'res-1', role: UserRole.RESIDENT };

describe('AssemblyService', () => {
  beforeEach(() => {
    prismaMock.assembly.findUniqueOrThrow.mockReset();
    prismaMock.assembly.findMany.mockReset();
    prismaMock.assembly.count.mockReset();
    prismaMock.assembly.create.mockReset();
    prismaMock.assembly.update.mockReset();
    prismaMock.assemblyVotingItem.findUniqueOrThrow.mockReset();
    prismaMock.assemblyVotingItem.findMany.mockReset();
    prismaMock.assemblyVote.upsert.mockReset();
    prismaMock.assemblyAttendee.upsert.mockReset();
    prismaMock.condominiumUser.findFirst.mockReset();
    prismaMock.condominiumUser.findMany.mockReset();
    prismaMock.$transaction.mockReset();
    (NotificationService.enqueue as any).mockReset();
  });

  describe('list — paginação', () => {
    it('calcula skip a partir de page/limit + totalPages', async () => {
      prismaMock.$transaction.mockResolvedValue([
        [{ id: 'a-1' }],
        25,
      ] as any);
      const result = await assemblyService.list('c-1', 2, 10);
      expect(result).toEqual({
        assemblies: [{ id: 'a-1' }],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('defaults page=1 limit=20', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0] as any);
      const result = await assemblyService.list('c-1');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getById — multi-tenancy', () => {
    it('SUPER_ADMIN bypass + retorna com votingItems + attendees count', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      await assemblyService.getById('a-1', superAdmin);
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });

    it('fail-closed: ator sem membership recebe 403', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'a-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(assemblyService.getById('a-1', admin)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('create', () => {
    it('cria assembleia + votingItems e notifica todos os membros do condomínio', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.assembly.create.mockResolvedValue({
        id: 'a-new',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findMany.mockResolvedValue([
        { userId: 'u-1' },
        { userId: 'u-2' },
      ] as any);

      await assemblyService.create(
        {
          condominiumId: 'c-1',
          title: 'AGO 2026',
          scheduledAt: new Date('2026-06-01T19:00:00Z'),
          createdBy: admin.userId,
          votingItems: [
            {
              title: 'Aprovar orçamento',
              options: [
                { id: 'sim', text: 'Sim' },
                { id: 'nao', text: 'Não' },
              ],
            },
          ],
        },
        admin,
      );

      const createArg: any = prismaMock.assembly.create.mock.calls[0]![0];
      expect(createArg.data.votingItems.create).toHaveLength(1);
      expect(NotificationService.enqueue).toHaveBeenCalledTimes(2);
      expect(NotificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-1',
          type: 'ASSEMBLY',
          title: 'Nova Assembleia Agendada',
          channels: ['inapp', 'email', 'push'],
          data: { assemblyId: 'a-new' },
        }),
      );
    });

    it('fail-closed: ator sem membership recebe 403 antes de criar', async () => {
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        assemblyService.create(
          {
            condominiumId: 'c-x',
            title: 'X',
            scheduledAt: new Date(),
            createdBy: admin.userId,
          },
          admin,
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.assembly.create).not.toHaveBeenCalled();
      expect(NotificationService.enqueue).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN cria sem checar membership', async () => {
      prismaMock.assembly.create.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findMany.mockResolvedValue([] as any);
      await assemblyService.create(
        {
          condominiumId: 'c-1',
          title: 'X',
          scheduledAt: new Date(),
          createdBy: superAdmin.userId,
        },
        superAdmin,
      );
      expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus — máquina de estados', () => {
    function mockAccess(condoId = 'c-1') {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'a-1',
        condominiumId: condoId,
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
    }

    it('SCHEDULED → IN_PROGRESS: seta startedAt + notifica membros', async () => {
      mockAccess();
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        status: AssemblyStatus.SCHEDULED,
      } as any);
      prismaMock.assembly.update.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
        title: 'AGO',
      } as any);
      prismaMock.condominiumUser.findMany.mockResolvedValue([
        { userId: 'u-1' },
      ] as any);

      await assemblyService.updateStatus(
        'a-1',
        AssemblyStatus.IN_PROGRESS,
        admin,
      );

      const updateArg: any = prismaMock.assembly.update.mock.calls[0]![0];
      expect(updateArg.data.status).toBe(AssemblyStatus.IN_PROGRESS);
      expect(updateArg.data.startedAt).toBeInstanceOf(Date);
      expect(updateArg.data.finishedAt).toBeUndefined();
      expect(NotificationService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-1',
          title: 'Assembleia Iniciada',
          channels: ['inapp'],
        }),
      );
    });

    it('IN_PROGRESS → FINISHED: seta finishedAt, sem notificação', async () => {
      mockAccess();
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        status: AssemblyStatus.IN_PROGRESS,
      } as any);
      prismaMock.assembly.update.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);

      await assemblyService.updateStatus(
        'a-1',
        AssemblyStatus.FINISHED,
        admin,
      );

      const updateArg: any = prismaMock.assembly.update.mock.calls[0]![0];
      expect(updateArg.data.finishedAt).toBeInstanceOf(Date);
      expect(NotificationService.enqueue).not.toHaveBeenCalled();
    });

    it('rejeita SCHEDULED → FINISHED (transição inválida)', async () => {
      mockAccess();
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        status: AssemblyStatus.SCHEDULED,
      } as any);
      await expect(
        assemblyService.updateStatus('a-1', AssemblyStatus.FINISHED, admin),
      ).rejects.toBeInstanceOf(AppError);
      expect(prismaMock.assembly.update).not.toHaveBeenCalled();
    });

    it('rejeita FINISHED → IN_PROGRESS (estado terminal)', async () => {
      mockAccess();
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        status: AssemblyStatus.FINISHED,
      } as any);
      await expect(
        assemblyService.updateStatus('a-1', AssemblyStatus.IN_PROGRESS, admin),
      ).rejects.toThrow(/Transição inválida/);
    });

    it('rejeita CANCELED → qualquer (estado terminal)', async () => {
      mockAccess();
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        status: AssemblyStatus.CANCELED,
      } as any);
      await expect(
        assemblyService.updateStatus('a-1', AssemblyStatus.IN_PROGRESS, admin),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('fail-closed: ator sem membership recebe 403 antes de transitar', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'a-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        assemblyService.updateStatus('a-1', AssemblyStatus.IN_PROGRESS, admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.assembly.update).not.toHaveBeenCalled();
    });
  });

  describe('vote — janela IN_PROGRESS + A4', () => {
    it('upsert do voto quando assembleia está IN_PROGRESS e ator tem membership', async () => {
      prismaMock.assemblyVotingItem.findUniqueOrThrow.mockResolvedValue({
        id: 'vi-1',
        assemblyId: 'a-1',
        assembly: {
          id: 'a-1',
          condominiumId: 'c-1',
          status: AssemblyStatus.IN_PROGRESS,
        },
      } as any);
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.assemblyVote.upsert.mockResolvedValue({ id: 'v-new' } as any);

      const result = await assemblyService.vote('vi-1', resident.userId, 'sim', resident);
      expect(result.id).toBe('v-new');
      const callArg: any = prismaMock.assemblyVote.upsert.mock.calls[0]![0];
      expect(callArg.where).toEqual({
        votingItemId_userId: { votingItemId: 'vi-1', userId: 'res-1' },
      });
      expect(callArg.update.optionId).toBe('sim');
    });

    it('rejeita voto quando assembleia SCHEDULED', async () => {
      prismaMock.assemblyVotingItem.findUniqueOrThrow.mockResolvedValue({
        id: 'vi-1',
        assembly: { status: AssemblyStatus.SCHEDULED },
      } as any);
      await expect(
        assemblyService.vote('vi-1', resident.userId, 'sim', resident),
      ).rejects.toThrow(/em progresso/);
      expect(prismaMock.assemblyVote.upsert).not.toHaveBeenCalled();
    });

    it('rejeita voto quando assembleia FINISHED', async () => {
      prismaMock.assemblyVotingItem.findUniqueOrThrow.mockResolvedValue({
        id: 'vi-1',
        assembly: { status: AssemblyStatus.FINISHED },
      } as any);
      await expect(
        assemblyService.vote('vi-1', resident.userId, 'sim', resident),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('A4 fail-closed: ator sem membership recebe 403 mesmo com assembleia em progresso', async () => {
      prismaMock.assemblyVotingItem.findUniqueOrThrow.mockResolvedValue({
        id: 'vi-1',
        assemblyId: 'a-1',
        assembly: {
          condominiumId: 'c-other',
          status: AssemblyStatus.IN_PROGRESS,
        },
      } as any);
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        assemblyService.vote('vi-1', resident.userId, 'sim', resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.assemblyVote.upsert).not.toHaveBeenCalled();
    });
  });

  describe('registerAttendance', () => {
    it('upsert com update={} (idempotente)', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.assemblyAttendee.upsert.mockResolvedValue({} as any);
      await assemblyService.registerAttendance('a-1', resident.userId, resident);
      const callArg: any = prismaMock.assemblyAttendee.upsert.mock.calls[0]![0];
      expect(callArg.update).toEqual({});
      expect(callArg.create).toEqual({
        assemblyId: 'a-1',
        userId: 'res-1',
      });
    });

    it('fail-closed: 403 cross-tenant', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        assemblyService.registerAttendance('a-1', resident.userId, resident),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('getVotingResults — agregação', () => {
    it('conta votos por optionId e retorna totalVotes', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.assemblyVotingItem.findMany.mockResolvedValue([
        {
          id: 'vi-1',
          title: 'Aprovar orçamento',
          options: [
            { id: 'sim', text: 'Sim' },
            { id: 'nao', text: 'Não' },
            { id: 'abst', text: 'Abstenção' },
          ],
          votes: [
            { optionId: 'sim' },
            { optionId: 'sim' },
            { optionId: 'nao' },
            { optionId: 'abst' },
          ],
        },
      ] as any);

      const results = await assemblyService.getVotingResults('a-1', admin);
      expect(results).toHaveLength(1);
      expect(results[0].results).toEqual([
        { id: 'sim', text: 'Sim', votes: 2 },
        { id: 'nao', text: 'Não', votes: 1 },
        { id: 'abst', text: 'Abstenção', votes: 1 },
      ]);
      expect(results[0].totalVotes).toBe(4);
    });

    it('totalVotes=0 quando sem votos', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-1',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'm-1' } as any);
      prismaMock.assemblyVotingItem.findMany.mockResolvedValue([
        {
          id: 'vi-1',
          title: 'X',
          options: [{ id: 'sim', text: 'Sim' }],
          votes: [],
        },
      ] as any);
      const results = await assemblyService.getVotingResults('a-1', admin);
      expect(results[0].totalVotes).toBe(0);
      expect(results[0].results[0].votes).toBe(0);
    });

    it('fail-closed: 403 antes de consultar items', async () => {
      prismaMock.assembly.findUniqueOrThrow.mockResolvedValue({
        id: 'a-1',
        condominiumId: 'c-other',
      } as any);
      prismaMock.condominiumUser.findFirst.mockResolvedValue(null);
      await expect(
        assemblyService.getVotingResults('a-1', admin),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(prismaMock.assemblyVotingItem.findMany).not.toHaveBeenCalled();
    });
  });
});
