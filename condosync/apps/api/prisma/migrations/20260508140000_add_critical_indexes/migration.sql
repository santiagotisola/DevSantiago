-- Índices compostos para os hot-paths identificados na auditoria.
-- Em produção, aplicar com CREATE INDEX CONCURRENTLY para evitar
-- bloqueio de write na tabela; este arquivo usa CREATE INDEX
-- normal porque Prisma migrate deploy não suporta CONCURRENTLY.
--
-- Schema (schema.prisma) tem @@index correspondentes para que
-- migrate diff futuro não propunha removê-los.

-- ── charges ───────────────────────────────────────────────────
CREATE INDEX "charges_gatewayId_idx" ON "charges"("gatewayId");
CREATE INDEX "charges_unitId_status_dueDate_idx"
    ON "charges"("unitId", "status", "dueDate");
CREATE INDEX "charges_status_dueDate_idx"
    ON "charges"("status", "dueDate");

-- ── notifications: caixa de entrada do morador ────────────────
CREATE INDEX "notifications_userId_isRead_createdAt_idx"
    ON "notifications"("userId", "isRead", "createdAt");

-- ── parcels: dashboard de portaria ────────────────────────────
CREATE INDEX "parcels_unitId_status_receivedAt_idx"
    ON "parcels"("unitId", "status", "receivedAt");

-- ── audit_logs: filtros típicos por condomínio + tempo ────────
CREATE INDEX "audit_logs_condominiumId_createdAt_idx"
    ON "audit_logs"("condominiumId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx"
    ON "audit_logs"("entityType", "entityId");

-- ── financial_transactions: balancete e relatórios ────────────
CREATE INDEX "financial_transactions_accountId_type_paidAt_idx"
    ON "financial_transactions"("accountId", "type", "paidAt");
CREATE INDEX "financial_transactions_accountId_referenceMonth_type_idx"
    ON "financial_transactions"("accountId", "referenceMonth", "type");

-- ── service_orders ────────────────────────────────────────────
CREATE INDEX "service_orders_condominiumId_status_createdAt_idx"
    ON "service_orders"("condominiumId", "status", "createdAt");

-- ── fines ─────────────────────────────────────────────────────
CREATE INDEX "fines_condominiumId_status_createdAt_idx"
    ON "fines"("condominiumId", "status", "createdAt");
CREATE INDEX "fines_unitId_idx" ON "fines"("unitId");

-- ── vehicle_access_logs: cresce sem limite, queries por tempo
--    e por placa ────────────────────────────────────────────
CREATE INDEX "vehicle_access_logs_entryAt_idx"
    ON "vehicle_access_logs"("entryAt");
CREATE INDEX "vehicle_access_logs_plate_idx"
    ON "vehicle_access_logs"("plate");

-- ── reservations: overlap check ───────────────────────────────
-- Nota: o ideal seria EXCLUDE USING GIST com tstzrange, eliminando
-- de vez o race de reservas concorrentes. Mantemos índice btree
-- por simplicidade; constraint exclusiva fica para um próximo
-- lote (WS2-P1 item 7).
CREATE INDEX "reservations_commonAreaId_startDate_endDate_idx"
    ON "reservations"("commonAreaId", "startDate", "endDate");
