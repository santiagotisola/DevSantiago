import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { prismaMock } from '../../test/setup';
import {
  marketplaceService,
  CATEGORY_LABELS,
} from './marketplace.service';
import { NotFoundError } from '../../middleware/errorHandler';

describe('MarketplaceService', () => {
  beforeEach(() => {
    prismaMock.marketplacePartner.findMany.mockReset();
    prismaMock.marketplacePartner.findUnique.mockReset();
    prismaMock.marketplacePartner.create.mockReset();
    prismaMock.marketplacePartner.update.mockReset();
    prismaMock.marketplaceOffer.findMany.mockReset();
    prismaMock.marketplaceOffer.create.mockReset();
    prismaMock.marketplaceOffer.update.mockReset();
    prismaMock.marketplaceOffer.delete.mockReset();
  });

  describe('listCategories', () => {
    it('retorna value+label de todas as categorias do enum', () => {
      const result = marketplaceService.listCategories();
      expect(result).toHaveLength(6);
      expect(result.map((c) => c.value).sort()).toEqual(
        Object.keys(CATEGORY_LABELS).sort(),
      );
      expect(result.find((c) => c.value === 'saude')?.label).toBe(
        'Saúde & Bem-estar',
      );
    });
  });

  describe('listActivePartners', () => {
    it('filtra parceiros ativos + ofertas ACTIVE não-expiradas (validUntil null OR >= now)', async () => {
      prismaMock.marketplacePartner.findMany.mockResolvedValue([] as any);
      await marketplaceService.listActivePartners();
      const arg: any = prismaMock.marketplacePartner.findMany.mock.calls[0]![0];
      expect(arg.where).toEqual({ isActive: true });
      expect(arg.include.offers.where.status).toBe('ACTIVE');
      expect(arg.include.offers.where.OR).toHaveLength(2);
      expect(arg.include.offers.where.OR[0]).toEqual({ validUntil: null });
      expect(arg.include.offers.where.OR[1].validUntil.gte).toBeInstanceOf(Date);
      expect(arg.orderBy).toEqual([{ category: 'asc' }, { name: 'asc' }]);
    });
  });

  describe('listAllPartnersAdmin', () => {
    it('lista TODOS (sem filtro de isActive) ordenado por createdAt desc', async () => {
      prismaMock.marketplacePartner.findMany.mockResolvedValue([] as any);
      await marketplaceService.listAllPartnersAdmin();
      const arg: any = prismaMock.marketplacePartner.findMany.mock.calls[0]![0];
      expect(arg.where).toBeUndefined();
      expect(arg.orderBy).toEqual({ createdAt: 'desc' });
      expect(arg.include).toEqual({ offers: true });
    });
  });

  describe('togglePartnerActive', () => {
    it('NotFoundError quando id não existe', async () => {
      prismaMock.marketplacePartner.findUnique.mockResolvedValue(null);
      await expect(
        marketplaceService.togglePartnerActive('x'),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(prismaMock.marketplacePartner.update).not.toHaveBeenCalled();
    });

    it('inverte isActive=true → false', async () => {
      prismaMock.marketplacePartner.findUnique.mockResolvedValue({
        id: 'p-1',
        isActive: true,
      } as any);
      prismaMock.marketplacePartner.update.mockResolvedValue({
        id: 'p-1',
        isActive: false,
      } as any);
      const result = await marketplaceService.togglePartnerActive('p-1');
      expect(result.isActive).toBe(false);
      expect(prismaMock.marketplacePartner.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { isActive: false },
      });
    });

    it('inverte isActive=false → true', async () => {
      prismaMock.marketplacePartner.findUnique.mockResolvedValue({
        id: 'p-1',
        isActive: false,
      } as any);
      prismaMock.marketplacePartner.update.mockResolvedValue({
        id: 'p-1',
        isActive: true,
      } as any);
      const result = await marketplaceService.togglePartnerActive('p-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('listActiveOffers', () => {
    afterEach(() => vi.useRealTimers());

    it('sem categoria: filtra status=ACTIVE + parceiro ativo + validade', async () => {
      prismaMock.marketplaceOffer.findMany.mockResolvedValue([] as any);
      await marketplaceService.listActiveOffers();
      const arg: any = prismaMock.marketplaceOffer.findMany.mock.calls[0]![0];
      expect(arg.where.status).toBe('ACTIVE');
      expect(arg.where.partner).toEqual({ isActive: true });
      expect(arg.where.OR[0]).toEqual({ validUntil: null });
      expect(arg.include).toEqual({ partner: true });
    });

    it('com categoria: sobrescreve partner com {category, isActive:true}', async () => {
      prismaMock.marketplaceOffer.findMany.mockResolvedValue([] as any);
      await marketplaceService.listActiveOffers('saude');
      const arg: any = prismaMock.marketplaceOffer.findMany.mock.calls[0]![0];
      expect(arg.where.partner).toEqual({
        category: 'saude',
        isActive: true,
      });
    });

    it('usa Date() corrente na cláusula gte (não fica preso a timestamp antigo)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
      prismaMock.marketplaceOffer.findMany.mockResolvedValue([] as any);
      await marketplaceService.listActiveOffers();
      const arg: any = prismaMock.marketplaceOffer.findMany.mock.calls[0]![0];
      expect(arg.where.OR[1].validUntil.gte.toISOString()).toBe(
        '2030-01-01T00:00:00.000Z',
      );
    });
  });

  describe('createOffer', () => {
    it('converte validUntil string em Date', async () => {
      prismaMock.marketplaceOffer.create.mockResolvedValue({ id: 'o-1' } as any);
      await marketplaceService.createOffer({
        partnerId: 'p-1',
        title: 'X',
        description: 'Y',
        validUntil: '2026-12-31T23:59:59.000Z',
      });
      const arg: any = prismaMock.marketplaceOffer.create.mock.calls[0]![0];
      expect(arg.data.validUntil).toBeInstanceOf(Date);
      expect((arg.data.validUntil as Date).toISOString()).toBe(
        '2026-12-31T23:59:59.000Z',
      );
    });

    it('validUntil ausente fica undefined (não null)', async () => {
      prismaMock.marketplaceOffer.create.mockResolvedValue({ id: 'o-1' } as any);
      await marketplaceService.createOffer({
        partnerId: 'p-1',
        title: 'X',
        description: 'Y',
      });
      const arg: any = prismaMock.marketplaceOffer.create.mock.calls[0]![0];
      expect(arg.data.validUntil).toBeUndefined();
    });

    it('inclui partner no resultado', async () => {
      prismaMock.marketplaceOffer.create.mockResolvedValue({ id: 'o-1' } as any);
      await marketplaceService.createOffer({
        partnerId: 'p-1',
        title: 'X',
        description: 'Y',
      });
      const arg: any = prismaMock.marketplaceOffer.create.mock.calls[0]![0];
      expect(arg.include).toEqual({ partner: true });
    });
  });

  describe('updateOffer', () => {
    it('converte validUntil quando fornecido; undefined no resto', async () => {
      prismaMock.marketplaceOffer.update.mockResolvedValue({ id: 'o-1' } as any);
      await marketplaceService.updateOffer('o-1', { status: 'INACTIVE' });
      const arg: any = prismaMock.marketplaceOffer.update.mock.calls[0]![0];
      expect(arg.data.status).toBe('INACTIVE');
      expect(arg.data.validUntil).toBeUndefined();
    });
  });

  describe('deleteOffer', () => {
    it('chama delete com where.id', async () => {
      prismaMock.marketplaceOffer.delete.mockResolvedValue({} as any);
      await marketplaceService.deleteOffer('o-1');
      expect(prismaMock.marketplaceOffer.delete).toHaveBeenCalledWith({
        where: { id: 'o-1' },
      });
    });
  });
});
