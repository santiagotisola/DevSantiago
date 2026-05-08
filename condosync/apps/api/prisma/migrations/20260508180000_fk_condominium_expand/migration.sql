-- C4 fase EXPAND — adiciona FKs `condominiumId → condominiums(id)`
-- em 13 modelos que tinham a coluna como String solto. NOT VALID
-- significa que rows EXISTENTES não são checadas; apenas INSERTs
-- e UPDATEs futuros precisam respeitar a FK.
--
-- Cleanup de órfãos + VALIDATE CONSTRAINT vêm em sprints
-- subsequentes (ver apps/api/docs/runbooks/sprint-2-fk-expand.md).
--
-- Índices simples em (condominiumId) acompanham para acelerar
-- queries multi-tenant comuns. Onde já há índice composto
-- envolvendo condominiumId (charges, fines, etc), o single-column
-- aqui pode ser redundante mas é cheap (poucos KB) e cobre
-- queries que filtram apenas por condomínio.

-- ChatConversation
ALTER TABLE "chat_conversations"
    ADD CONSTRAINT "chat_conversations_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "chat_conversations_condominiumId_idx"
    ON "chat_conversations"("condominiumId");

-- FinancialCategory
ALTER TABLE "financial_categories"
    ADD CONSTRAINT "financial_categories_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "financial_categories_condominiumId_idx"
    ON "financial_categories"("condominiumId");

-- ServiceOrder
ALTER TABLE "service_orders"
    ADD CONSTRAINT "service_orders_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
-- Já existe índice composto (condominiumId, status, createdAt) — OK.

-- FinalizedAssembly
ALTER TABLE "finalized_assemblies"
    ADD CONSTRAINT "finalized_assemblies_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "finalized_assemblies_condominiumId_idx"
    ON "finalized_assemblies"("condominiumId");

-- Renovation
ALTER TABLE "renovations"
    ADD CONSTRAINT "renovations_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "renovations_condominiumId_idx"
    ON "renovations"("condominiumId");

-- StockItem
ALTER TABLE "stock_items"
    ADD CONSTRAINT "stock_items_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "stock_items_condominiumId_idx"
    ON "stock_items"("condominiumId");

-- Ticket
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "tickets_condominiumId_idx"
    ON "tickets"("condominiumId");

-- Photo
ALTER TABLE "photos"
    ADD CONSTRAINT "photos_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "photos_condominiumId_idx"
    ON "photos"("condominiumId");

-- CondominiumContract
ALTER TABLE "condominium_contracts"
    ADD CONSTRAINT "condominium_contracts_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "condominium_contracts_condominiumId_idx"
    ON "condominium_contracts"("condominiumId");

-- Fine
ALTER TABLE "fines"
    ADD CONSTRAINT "fines_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
-- Já existe índice composto (condominiumId, status, createdAt) — OK.

-- CollectionRule
ALTER TABLE "collection_rules"
    ADD CONSTRAINT "collection_rules_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "collection_rules_condominiumId_isActive_idx"
    ON "collection_rules"("condominiumId", "isActive");

-- DigitalSignageScreen
ALTER TABLE "digital_signage_screens"
    ADD CONSTRAINT "digital_signage_screens_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
CREATE INDEX IF NOT EXISTS "digital_signage_screens_condominiumId_idx"
    ON "digital_signage_screens"("condominiumId");
