import { PaginationParams, PaginatedResponse, PAGINATION_DEFAULTS } from './types';

/**
 * Extrai parâmetros de paginação de query params (com validação e limites).
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || PAGINATION_DEFAULTS.page);
  const rawLimit = Number(query.limit) || PAGINATION_DEFAULTS.limit;
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION_DEFAULTS.maxLimit);
  return { page, limit };
}

/**
 * Calcula skip/take do Prisma a partir de PaginationParams.
 */
export function paginateQuery(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

/**
 * Cria uma resposta paginada tipada.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
}
