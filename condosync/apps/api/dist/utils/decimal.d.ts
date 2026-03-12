import { Prisma } from '@prisma/client';
/**
 * Converte Prisma.Decimal | null | undefined para number.
 * Usado em respostas JSON, já que Decimal não é serializado automaticamente.
 */
export declare function toNumber(value: Prisma.Decimal | null | undefined): number;
/**
 * Converte Prisma.Decimal | null | undefined para number, retornando null se ausente.
 */
export declare function toNumberOrNull(value: Prisma.Decimal | null | undefined): number | null;
/**
 * Arredonda um number para 2 casas decimais (padrão monetário).
 */
export declare function roundMoney(value: number, decimals?: number): number;
//# sourceMappingURL=decimal.d.ts.map