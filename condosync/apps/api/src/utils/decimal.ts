import { Prisma } from '@prisma/client';

/**
 * Converte Prisma.Decimal | null | undefined para number.
 * Usado em respostas JSON, já que Decimal não é serializado automaticamente.
 */
export function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value.toNumber();
}

/**
 * Converte Prisma.Decimal | null | undefined para number, retornando null se ausente.
 */
export function toNumberOrNull(value: Prisma.Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value.toNumber();
}

/**
 * Arredonda um number para 2 casas decimais (padrão monetário).
 */
export function roundMoney(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
