"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.paginateQuery = paginateQuery;
exports.createPaginatedResponse = createPaginatedResponse;
const types_1 = require("./types");
/**
 * Extrai parâmetros de paginação de query params (com validação e limites).
 */
function parsePagination(query) {
    const page = Math.max(1, Number(query.page) || types_1.PAGINATION_DEFAULTS.page);
    const rawLimit = Number(query.limit) || types_1.PAGINATION_DEFAULTS.limit;
    const limit = Math.min(Math.max(1, rawLimit), types_1.PAGINATION_DEFAULTS.maxLimit);
    return { page, limit };
}
/**
 * Calcula skip/take do Prisma a partir de PaginationParams.
 */
function paginateQuery(params) {
    return {
        skip: (params.page - 1) * params.limit,
        take: params.limit,
    };
}
/**
 * Cria uma resposta paginada tipada.
 */
function createPaginatedResponse(data, total, params) {
    return {
        data,
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
    };
}
//# sourceMappingURL=pagination.js.map