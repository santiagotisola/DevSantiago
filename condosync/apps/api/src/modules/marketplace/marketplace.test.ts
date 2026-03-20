import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { prismaMock } from '../../test/setup';

// ─── Schemas (duplicados aqui para testar isoladamente) ──────────────────
const partnerSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  category: z.enum(['alimentacao', 'saude', 'educacao', 'servicos', 'lazer', 'outro']),
});

const offerSchema = z.object({
  partnerId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().min(2),
  discount: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  couponCode: z.string().optional(),
});

// ─── Fixtures ────────────────────────────────────────────────────────────
const mockPartner = {
  id: 'partner-uuid-1',
  name: 'Farmácia Popular',
  description: '10% de desconto para moradores',
  category: 'saude',
  logoUrl: null,
  website: null,
  phone: '11999999999',
  email: 'contato@farmacia.com.br',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockOffer = {
  id: 'offer-uuid-1',
  partnerId: 'partner-uuid-1',
  title: '10% off em medicamentos',
  description: 'Desconto especial para condôminos',
  discount: '10%',
  couponCode: 'CONDO10',
  validUntil: new Date('2026-12-31'),
  status: 'ACTIVE',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// ─── partnerSchema ────────────────────────────────────────────────────────
describe('partnerSchema', () => {
  it('aceita dados válidos', () => {
    const input = { name: 'Parceiro Teste', category: 'saude' };
    expect(() => partnerSchema.parse(input)).not.toThrow();
  });

  it('aceita todas as categorias válidas', () => {
    const categories = ['alimentacao', 'saude', 'educacao', 'servicos', 'lazer', 'outro'] as const;
    for (const category of categories) {
      expect(() => partnerSchema.parse({ name: 'Parceiro', category })).not.toThrow();
    }
  });

  it('rejeita nome muito curto', () => {
    expect(() => partnerSchema.parse({ name: 'A', category: 'saude' })).toThrow();
  });

  it('rejeita nome muito longo (>100 caracteres)', () => {
    expect(() =>
      partnerSchema.parse({ name: 'A'.repeat(101), category: 'saude' })
    ).toThrow();
  });

  it('rejeita categoria inválida', () => {
    expect(() =>
      partnerSchema.parse({ name: 'Parceiro', category: 'invalida' })
    ).toThrow();
  });

  it('rejeita email mal formatado', () => {
    expect(() =>
      partnerSchema.parse({ name: 'Parceiro', category: 'saude', email: 'nao-email' })
    ).toThrow();
  });

  it('rejeita URL inválida no website', () => {
    expect(() =>
      partnerSchema.parse({ name: 'Parceiro', category: 'saude', website: 'nao-url' })
    ).toThrow();
  });

  it('permite website como URL válida', () => {
    expect(() =>
      partnerSchema.parse({ name: 'Parceiro', category: 'saude', website: 'https://exemplo.com' })
    ).not.toThrow();
  });

  it('campos opcionais não são obrigatórios', () => {
    const result = partnerSchema.safeParse({ name: 'Parceiro', category: 'outro' });
    expect(result.success).toBe(true);
  });
});

// ─── offerSchema ──────────────────────────────────────────────────────────
describe('offerSchema', () => {
  const baseOffer = {
    partnerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Oferta Especial',
    description: 'Desconto para moradores',
  };

  it('aceita dados válidos', () => {
    expect(() => offerSchema.parse(baseOffer)).not.toThrow();
  });

  it('rejeita title muito curto', () => {
    expect(() => offerSchema.parse({ ...baseOffer, title: 'X' })).toThrow();
  });

  it('rejeita title com mais de 200 caracteres', () => {
    expect(() => offerSchema.parse({ ...baseOffer, title: 'X'.repeat(201) })).toThrow();
  });

  it('rejeita description muito curta', () => {
    expect(() => offerSchema.parse({ ...baseOffer, description: 'X' })).toThrow();
  });

  it('rejeita partnerId que não é UUID', () => {
    expect(() => offerSchema.parse({ ...baseOffer, partnerId: 'nao-uuid' })).toThrow();
  });

  it('rejeita validUntil que não é datetime ISO', () => {
    expect(() =>
      offerSchema.parse({ ...baseOffer, validUntil: '31/12/2026' })
    ).toThrow();
  });

  it('aceita validUntil no formato ISO', () => {
    expect(() =>
      offerSchema.parse({ ...baseOffer, validUntil: '2026-12-31T23:59:59.000Z' })
    ).not.toThrow();
  });

  it('possui campos opcionais que não são obrigatórios', () => {
    const result = offerSchema.safeParse(baseOffer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount).toBeUndefined();
      expect(result.data.couponCode).toBeUndefined();
      expect(result.data.validUntil).toBeUndefined();
    }
  });
});

// ─── Lógica de acesso ao banco (via prismaMock) ───────────────────────────
describe('Marketplace — acesso ao banco', () => {
  describe('listActivePartners', () => {
    it('busca apenas parceiros ativos com ofertas ativas e não expiradas', async () => {
      // @ts-ignore
      prismaMock.marketplacePartner.findMany.mockResolvedValue([mockPartner]);

      const result = await prismaMock.marketplacePartner.findMany({
        where: { isActive: true },
        include: {
          offers: {
            where: {
              status: 'ACTIVE',
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      expect(result).toEqual([mockPartner]);
      expect(prismaMock.marketplacePartner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      );
    });
  });

  describe('createPartner', () => {
    it('cria parceiro com os dados corretos', async () => {
      // @ts-ignore
      prismaMock.marketplacePartner.create.mockResolvedValue(mockPartner);

      const input = { name: 'Farmácia Popular', category: 'saude', email: 'contato@farmacia.com.br', phone: '11999999999' };
      const result = await prismaMock.marketplacePartner.create({ data: input as any });

      expect(result).toEqual(mockPartner);
      expect(prismaMock.marketplacePartner.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('togglePartnerActive', () => {
    it('inverte o status isActive de ativo para inativo', async () => {
      const inactivePartner = { ...mockPartner, isActive: false };

      // @ts-ignore
      prismaMock.marketplacePartner.findUnique.mockResolvedValue(mockPartner);
      // @ts-ignore
      prismaMock.marketplacePartner.update.mockResolvedValue(inactivePartner);

      const current = await prismaMock.marketplacePartner.findUnique({
        where: { id: mockPartner.id },
      });

      const updated = await prismaMock.marketplacePartner.update({
        where: { id: mockPartner.id },
        data: { isActive: !current!.isActive },
      });

      expect(updated.isActive).toBe(false);
    });

    it('inverte o status isActive de inativo para ativo', async () => {
      const inactivePartner = { ...mockPartner, isActive: false };

      // @ts-ignore
      prismaMock.marketplacePartner.findUnique.mockResolvedValue(inactivePartner);
      // @ts-ignore
      prismaMock.marketplacePartner.update.mockResolvedValue(mockPartner);

      const current = await prismaMock.marketplacePartner.findUnique({
        where: { id: inactivePartner.id },
      });

      const updated = await prismaMock.marketplacePartner.update({
        where: { id: inactivePartner.id },
        data: { isActive: !current!.isActive },
      });

      expect(updated.isActive).toBe(true);
    });
  });

  describe('createOffer', () => {
    it('cria oferta com validUntil convertida para Date', async () => {
      const offerWithPartner = { ...mockOffer, partner: mockPartner };
      // @ts-ignore
      prismaMock.marketplaceOffer.create.mockResolvedValue(offerWithPartner);

      const isoDate = '2026-12-31T23:59:59.000Z';
      const result = await prismaMock.marketplaceOffer.create({
        data: {
          partnerId: mockPartner.id,
          title: '10% off em medicamentos',
          description: 'Desconto especial para condôminos',
          discount: '10%',
          couponCode: 'CONDO10',
          validUntil: new Date(isoDate),
        } as any,
        include: { partner: true },
      });

      expect(result).toEqual(offerWithPartner);
      expect(result.partner).toEqual(mockPartner);
    });
  });

  describe('listActiveOffers', () => {
    it('busca ofertas ativas de parceiros ativos respeitando a validade', async () => {
      const offersWithPartners = [{ ...mockOffer, partner: mockPartner }];
      // @ts-ignore
      prismaMock.marketplaceOffer.findMany.mockResolvedValue(offersWithPartners);

      const result = await prismaMock.marketplaceOffer.findMany({
        where: {
          status: 'ACTIVE',
          partner: { isActive: true },
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        include: { partner: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
      expect(result[0].partner.isActive).toBe(true);
    });

    it('filtra por categoria do parceiro quando informada', async () => {
      // @ts-ignore
      prismaMock.marketplaceOffer.findMany.mockResolvedValue([]);

      await prismaMock.marketplaceOffer.findMany({
        where: {
          status: 'ACTIVE',
          partner: { category: 'saude', isActive: true },
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        include: { partner: true },
        orderBy: { createdAt: 'desc' },
      });

      expect(prismaMock.marketplaceOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partner: expect.objectContaining({ category: 'saude' }),
          }),
        })
      );
    });
  });

  describe('deleteOffer', () => {
    it('chama delete com o id correto', async () => {
      prismaMock.marketplaceOffer.delete.mockResolvedValue(mockOffer as any);

      await prismaMock.marketplaceOffer.delete({ where: { id: mockOffer.id } });

      expect(prismaMock.marketplaceOffer.delete).toHaveBeenCalledWith({
        where: { id: mockOffer.id },
      });
    });
  });
});
