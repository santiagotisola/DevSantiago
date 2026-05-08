/**
 * DTOs e tipos compartilhados entre sub-contexts do domínio
 * financeiro. Cada sub-context pode ter seus próprios tipos
 * específicos em `<context>/types.ts`; aqui ficam apenas tipos
 * que cruzam boundaries.
 */
import type { Prisma, UserRole } from "@prisma/client";

/**
 * "Actor" — autorização contextual em operações financeiras.
 * Já existia no service legado; movido para shared.
 */
export interface FinanceActor {
  userId: string;
  role: UserRole;
}

/**
 * Transação Prisma reutilizável — passada por orchestrators
 * (billing.service) para coordenar múltiplos sub-services em
 * uma única transação atômica.
 *
 * Sub-services aceitam `tx?: PrismaTx`; se ausente, usam
 * `prisma` diretamente.
 */
export type PrismaTx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Page envelope para listagens. Cursor pagination preferido em
 * tabelas grandes; offset apenas em listas pequenas.
 */
export interface Page<T> {
  items: T[];
  total?: number;     // offset
  nextCursor?: string; // cursor
  page?: number;
  limit: number;
}
