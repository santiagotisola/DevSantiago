// ─────────────────────────────────────────────────────────────
// CondoSync — Shared Types
// Tipos centralizados para uso em todos os módulos
// ─────────────────────────────────────────────────────────────

/**
 * Parâmetros de paginação padrão para queries.
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Resposta paginada genérica.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Resposta padrão da API.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Resposta de erro da API.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

/**
 * Defaults de paginação.
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;
