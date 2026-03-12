import { PaginationParams, PaginatedResponse } from './types';
/**
 * Extrai parâmetros de paginação de query params (com validação e limites).
 */
export declare function parsePagination(query: Record<string, unknown>): PaginationParams;
/**
 * Calcula skip/take do Prisma a partir de PaginationParams.
 */
export declare function paginateQuery(params: PaginationParams): {
    skip: number;
    take: number;
};
/**
 * Cria uma resposta paginada tipada.
 */
export declare function createPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T>;
//# sourceMappingURL=pagination.d.ts.map