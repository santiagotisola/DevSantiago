"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumber = toNumber;
exports.toNumberOrNull = toNumberOrNull;
exports.roundMoney = roundMoney;
/**
 * Converte Prisma.Decimal | null | undefined para number.
 * Usado em respostas JSON, já que Decimal não é serializado automaticamente.
 */
function toNumber(value) {
    if (value === null || value === undefined)
        return 0;
    return value.toNumber();
}
/**
 * Converte Prisma.Decimal | null | undefined para number, retornando null se ausente.
 */
function toNumberOrNull(value) {
    if (value === null || value === undefined)
        return null;
    return value.toNumber();
}
/**
 * Arredonda um number para 2 casas decimais (padrão monetário).
 */
function roundMoney(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
//# sourceMappingURL=decimal.js.map