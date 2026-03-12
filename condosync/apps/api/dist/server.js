"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
// Inicializar workers em background
require("./notifications/notification.worker");
// Rotas
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("./modules/users/user.routes"));
const condominium_routes_1 = __importDefault(require("./modules/condominiums/condominium.routes"));
const unit_routes_1 = __importDefault(require("./modules/units/unit.routes"));
const resident_routes_1 = __importDefault(require("./modules/residents/resident.routes"));
const visitor_routes_1 = __importDefault(require("./modules/visitors/visitor.routes"));
const parcel_routes_1 = __importDefault(require("./modules/parcels/parcel.routes"));
const vehicle_routes_1 = __importDefault(require("./modules/vehicles/vehicle.routes"));
const communication_routes_1 = __importDefault(require("./modules/communication/communication.routes"));
const finance_routes_1 = __importDefault(require("./modules/finance/finance.routes"));
const maintenance_routes_1 = __importDefault(require("./modules/maintenance/maintenance.routes"));
const commonArea_routes_1 = __importDefault(require("./modules/common-areas/commonArea.routes"));
const report_routes_1 = __importDefault(require("./modules/reports/report.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const employee_routes_1 = __importDefault(require("./modules/employees/employee.routes"));
const serviceProvider_routes_1 = __importDefault(require("./modules/service-providers/serviceProvider.routes"));
const asaas_routes_1 = __importDefault(require("./modules/webhooks/asaas.routes"));
const assembly_routes_1 = __importDefault(require("./modules/assemblies/assembly.routes"));
const pet_routes_1 = __importDefault(require("./modules/pets/pet.routes"));
const lost_and_found_routes_1 = __importDefault(require("./modules/lost-and-found/lost-and-found.routes"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// ─── Socket.IO ───────────────────────────────────────────────
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.env.CORS_ORIGINS.split(','),
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
exports.io.on('connection', (socket) => {
    logger_1.logger.info(`Socket conectado: ${socket.id}`);
    socket.on('join:condominium', (condominiumId) => {
        socket.join(`condominium:${condominiumId}`);
    });
    socket.on('join:unit', (unitId) => {
        socket.join(`unit:${unitId}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Socket desconectado: ${socket.id}`);
    });
});
// ─── Middleware Global ────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGINS.split(','),
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) },
}));
app.use(rateLimiter_1.rateLimiter);
// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: env_1.env.NODE_ENV,
    });
});
// ─── Rotas da API ─────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, auth_routes_1.default);
app.use(`${API}/users`, user_routes_1.default);
app.use(`${API}/condominiums`, condominium_routes_1.default);
app.use(`${API}/units`, unit_routes_1.default);
app.use(`${API}/residents`, resident_routes_1.default);
app.use(`${API}/visitors`, visitor_routes_1.default);
app.use(`${API}/parcels`, parcel_routes_1.default);
app.use(`${API}/vehicles`, vehicle_routes_1.default);
app.use(`${API}/communication`, communication_routes_1.default);
app.use(`${API}/finance`, finance_routes_1.default);
app.use(`${API}/maintenance`, maintenance_routes_1.default);
app.use(`${API}/common-areas`, commonArea_routes_1.default);
app.use(`${API}/reports`, report_routes_1.default);
app.use(`${API}/dashboard`, dashboard_routes_1.default);
app.use(`${API}/employees`, employee_routes_1.default);
app.use(`${API}/service-providers`, serviceProvider_routes_1.default);
app.use(`${API}/webhooks`, asaas_routes_1.default);
app.use(`${API}/assemblies`, assembly_routes_1.default);
app.use(`${API}/pets`, pet_routes_1.default);
app.use(`${API}/lost-and-found`, lost_and_found_routes_1.default);
// ─── Error Handlers ───────────────────────────────────────────
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// ─── Start Server ─────────────────────────────────────────────
const PORT = env_1.env.PORT || 3333;
httpServer.listen(PORT, () => {
    logger_1.logger.info(`🚀 CondoSync API rodando na porta ${PORT}`);
    logger_1.logger.info(`📋 Ambiente: ${env_1.env.NODE_ENV}`);
    logger_1.logger.info(`📍 URL: http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map