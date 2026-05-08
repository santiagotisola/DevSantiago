import type { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Lê page e limit de req.query com sanitização e clamp.
 * Antes esse padrão era reescrito em cada lista do API:
 *   const page = Number(req.query.page) || 1;
 *   const limit = Number(req.query.limit) || 20;
 *
 * O clamp do limit em 100 evita que um cliente peça `?limit=999999`
 * e force um SELECT sem teto na tabela.
 */
export function parsePagination(
  req: Request,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  const defLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  const rawPage = Number(req.query.page);
  const rawLimit = Number(req.query.limit);

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT_PAGE;

  const limitCandidate =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.floor(rawLimit) : defLimit;
  const limit = Math.min(limitCandidate, maxLimit);

  return { page, limit, skip: (page - 1) * limit };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginatedMeta(
  params: PaginationParams,
  total: number,
): PaginatedMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

// ─── Cursor pagination ─────────────────────────────────────────
// Para tabelas que crescem sem limite (charges, parcels, audit_logs,
// notifications, vehicle_access_logs, chat_messages), offset
// pagination ficou inviável: ?page=1000 força o Postgres a varrer
// 20k linhas só para descartar 19980. Cursor é O(log N).
//
// O cursor canônico aqui é o `id` (uuid) — funciona como tiebreaker
// estável quando criados no mesmo timestamp. Cliente envia
// ?cursor=<id>&limit=20; servidor retorna { items, nextCursor }.

export interface CursorParams {
  cursor: string | undefined;
  limit: number;
}

export function parseCursor(req: Request, defaultLimit = 20): CursorParams {
  const rawLimit = Number(req.query.limit);
  const limit = Math.min(
    100,
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.floor(rawLimit)
      : defaultLimit,
  );
  const cursor =
    typeof req.query.cursor === "string" && req.query.cursor.length > 0
      ? req.query.cursor
      : undefined;
  return { cursor, limit };
}

/**
 * Aplica params Prisma para cursor pagination. Pede `limit + 1`
 * para saber se existe próxima página sem segundo round-trip.
 *
 * Uso:
 *   const { cursor, limit } = parseCursor(req);
 *   const items = await prisma.charge.findMany({
 *     ...buildCursorArgs({ cursor, limit }),
 *     where: { ... },
 *     orderBy: { createdAt: 'desc' },
 *   });
 *   const { page, nextCursor } = sliceCursorPage(items, limit);
 */
export function buildCursorArgs(params: CursorParams) {
  return {
    take: params.limit + 1,
    ...(params.cursor
      ? { cursor: { id: params.cursor }, skip: 1 }
      : {}),
  };
}

export function sliceCursorPage<T extends { id: string }>(
  items: T[],
  limit: number,
): { page: T[]; nextCursor: string | null } {
  if (items.length > limit) {
    const page = items.slice(0, limit);
    return { page, nextCursor: page[page.length - 1]?.id ?? null };
  }
  return { page: items, nextCursor: null };
}
