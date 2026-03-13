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
export declare const PAGINATION_DEFAULTS: {
    readonly page: 1;
    readonly limit: 20;
    readonly maxLimit: 100;
};
//# sourceMappingURL=types.d.ts.map