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
