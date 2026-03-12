import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

// Inicializar workers em background
import "./notifications/notification.worker";
import { registerMaintenanceAlertsSchedule } from "./modules/maintenance/maintenance.alerts.worker";

// Rotas
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import condominiumRoutes from "./modules/condominiums/condominium.routes";
import unitRoutes from "./modules/units/unit.routes";
import residentRoutes from "./modules/residents/resident.routes";
import visitorRoutes from "./modules/visitors/visitor.routes";
import parcelRoutes from "./modules/parcels/parcel.routes";
import vehicleRoutes from "./modules/vehicles/vehicle.routes";
import communicationRoutes from "./modules/communication/communication.routes";
import financeRoutes from "./modules/finance/finance.routes";
import maintenanceRoutes from "./modules/maintenance/maintenance.routes";
import commonAreaRoutes from "./modules/common-areas/commonArea.routes";
import reportRoutes from "./modules/reports/report.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import serviceProviderRoutes from "./modules/service-providers/serviceProvider.routes";
import webhookRoutes from "./modules/webhooks/asaas.routes";
import assemblyRoutes from "./modules/assemblies/assembly.routes";
import petRoutes from "./modules/pets/pet.routes";
import lostAndFoundRoutes from "./modules/lost-and-found/lost-and-found.routes";
import documentRoutes from "./modules/documents/document.routes";
import renovationRoutes from "./modules/renovations/renovation.routes";
const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);

  socket.on("join:condominium", (condominiumId: string) => {
    socket.join(`condominium:${condominiumId}`);
  });

  socket.on("join:unit", (unitId: string) => {
    socket.join(`unit:${unitId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Socket desconectado: ${socket.id}`);
  });
});

// ─── Middleware Global ────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);
app.use(rateLimiter);

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
  });
});

// ─── Rotas da API ─────────────────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/condominiums`, condominiumRoutes);
app.use(`${API}/units`, unitRoutes);
app.use(`${API}/residents`, residentRoutes);
app.use(`${API}/visitors`, visitorRoutes);
app.use(`${API}/parcels`, parcelRoutes);
app.use(`${API}/vehicles`, vehicleRoutes);
app.use(`${API}/communication`, communicationRoutes);
app.use(`${API}/finance`, financeRoutes);
app.use(`${API}/maintenance`, maintenanceRoutes);
app.use(`${API}/common-areas`, commonAreaRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/employees`, employeeRoutes);
app.use(`${API}/service-providers`, serviceProviderRoutes);
app.use(`${API}/webhooks`, webhookRoutes);
app.use(`${API}/assemblies`, assemblyRoutes);
app.use(`${API}/pets`, petRoutes);
app.use(`${API}/lost-and-found`, lostAndFoundRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/renovations`, renovationRoutes);

// ─── Error Handlers ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const PORT = env.PORT || 3333;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 CondoSync API rodando na porta ${PORT}`);
  logger.info(`📋 Ambiente: ${env.NODE_ENV}`);
  logger.info(`📍 URL: http://localhost:${PORT}`);
  await registerMaintenanceAlertsSchedule();
});

export default app;
