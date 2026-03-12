"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const errorHandler_1 = require("../middleware/errorHandler");
function validateRequest(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        throw new errorHandler_1.ValidationError('Dados inválidos', errors);
    }
    return result.data;
}
//# sourceMappingURL=validateRequest.js.map