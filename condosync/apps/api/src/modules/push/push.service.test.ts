import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../test/setup';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

import webpush from 'web-push';
import { pushService } from './push.service';

const USER_ID = 'u1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pushService', () => {
  describe('subscribe', () => {
    it('faz upsert idempotente por endpoint', async () => {
      prismaMock.pushSubscription.upsert.mockResolvedValue({ id: 's1' } as any);
      await pushService.subscribe(USER_ID, {
        endpoint: 'https://fcm/abc',
        keys: { p256dh: 'p', auth: 'a' },
      });
      const call = prismaMock.pushSubscription.upsert.mock.calls[0][0] as any;
      expect(call.where).toEqual({ endpoint: 'https://fcm/abc' });
      expect(call.create.userId).toBe(USER_ID);
      expect(call.update.userId).toBe(USER_ID);
    });
  });

  describe('getUserIdsOfUnit', () => {
    it('mapeia rows para userIds', async () => {
      prismaMock.condominiumUser.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ] as any);
      const r = await pushService.getUserIdsOfUnit('unit-1');
      expect(r).toEqual(['a', 'b']);
    });
  });

  describe('getResidentIdsOfCondominium', () => {
    it('dedup userIds duplicados', async () => {
      prismaMock.condominiumUser.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
        { userId: 'a' },
      ] as any);
      const r = await pushService.getResidentIdsOfCondominium('c1');
      expect(r.sort()).toEqual(['a', 'b']);
    });
  });

  describe('_sendBatch', () => {
    it('remove subscription quando gateway responde 410 (gone)', async () => {
      (webpush.sendNotification as any).mockRejectedValue({ statusCode: 410 });
      prismaMock.pushSubscription.delete.mockResolvedValue({} as any);

      // Configurar VAPID via env para passar pelo ensureVapid em sendToUser
      process.env.VAPID_PUBLIC_KEY = 'pub';
      process.env.VAPID_PRIVATE_KEY = 'priv';
      process.env.VAPID_SUBJECT = 'mailto:a@b.com';

      const r = await pushService._sendBatch(
        [{ id: 's1', endpoint: 'e', p256dh: 'p', auth: 'a' }],
        { title: 't', body: 'b' },
      );
      expect(r).toEqual({ sent: 0, failed: 0, pruned: 1 });
      expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });

    it('conta falhas genéricas sem deletar', async () => {
      (webpush.sendNotification as any).mockRejectedValue({ statusCode: 500 });
      const r = await pushService._sendBatch(
        [{ id: 's1', endpoint: 'e', p256dh: 'p', auth: 'a' }],
        { title: 't', body: 'b' },
      );
      expect(r).toEqual({ sent: 0, failed: 1, pruned: 0 });
      expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
    });

    it('conta envios bem-sucedidos', async () => {
      (webpush.sendNotification as any).mockResolvedValue({});
      const r = await pushService._sendBatch(
        [
          { id: 's1', endpoint: 'e1', p256dh: 'p', auth: 'a' },
          { id: 's2', endpoint: 'e2', p256dh: 'p', auth: 'a' },
        ],
        { title: 't', body: 'b' },
      );
      expect(r.sent).toBe(2);
      expect(r.failed).toBe(0);
    });
  });
});
