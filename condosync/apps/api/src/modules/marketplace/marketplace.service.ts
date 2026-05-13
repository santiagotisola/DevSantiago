import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../middleware/errorHandler";

export const MARKETPLACE_CATEGORIES = [
  "alimentacao",
  "saude",
  "educacao",
  "servicos",
  "lazer",
  "outro",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  alimentacao: "Alimentação",
  saude: "Saúde & Bem-estar",
  educacao: "Educação",
  servicos: "Serviços",
  lazer: "Lazer & Entretenimento",
  outro: "Outros",
};

export interface CreatePartnerDTO {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  phone?: string;
  email?: string;
  category: MarketplaceCategory;
}

export type UpdatePartnerDTO = Partial<CreatePartnerDTO>;

export interface CreateOfferDTO {
  partnerId: string;
  title: string;
  description: string;
  discount?: string;
  validUntil?: string;
  couponCode?: string;
}

export interface UpdateOfferDTO {
  status?: "ACTIVE" | "INACTIVE" | "EXPIRED";
  title?: string;
  description?: string;
  discount?: string;
  couponCode?: string;
  validUntil?: string;
}

export class MarketplaceService {
  listCategories() {
    return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
    }));
  }

  // Lista pública: parceiros ativos com ofertas ativas e não expiradas.
  async listActivePartners() {
    return prisma.marketplacePartner.findMany({
      where: { isActive: true },
      include: {
        offers: {
          where: {
            status: "ACTIVE",
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async listAllPartnersAdmin() {
    return prisma.marketplacePartner.findMany({
      include: { offers: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPartner(data: CreatePartnerDTO) {
    return prisma.marketplacePartner.create({ data });
  }

  async updatePartner(id: string, data: UpdatePartnerDTO) {
    return prisma.marketplacePartner.update({ where: { id }, data });
  }

  async togglePartnerActive(id: string) {
    const current = await prisma.marketplacePartner.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundError("Parceiro", id);
    return prisma.marketplacePartner.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
  }

  async listActiveOffers(category?: string) {
    const where: any = {
      status: "ACTIVE",
      partner: { isActive: true },
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    };
    if (category) {
      where.partner = { category, isActive: true };
    }
    return prisma.marketplaceOffer.findMany({
      where,
      include: { partner: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createOffer(data: CreateOfferDTO) {
    return prisma.marketplaceOffer.create({
      data: {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
      include: { partner: true },
    });
  }

  async updateOffer(id: string, data: UpdateOfferDTO) {
    return prisma.marketplaceOffer.update({
      where: { id },
      data: {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });
  }

  async deleteOffer(id: string) {
    await prisma.marketplaceOffer.delete({ where: { id } });
  }
}

export const marketplaceService = new MarketplaceService();
