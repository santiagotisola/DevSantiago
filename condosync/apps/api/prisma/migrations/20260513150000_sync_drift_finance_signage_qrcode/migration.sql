-- ============================================================
-- Migration manual para sincronizar drift entre schema.prisma e
-- o estado real do banco de produção em 2026-05-13.
--
-- Contexto: tabelas abaixo existem no schema.prisma há tempos mas
-- nunca tiveram migration formal — foram criadas em ambientes
-- pontuais via `prisma db push`. Esta migration formaliza o
-- estado para que `prisma migrate deploy` consiga aplicar em
-- qualquer ambiente.
--
-- IF NOT EXISTS / IF EXISTS são defensivos: em ambientes que já
-- aplicaram parte do schema via db push, evita "relation already
-- exists". Em ambientes limpos roda como uma migration normal.
--
-- NÃO incluído nesta migration (já aplicado em prod por outro
-- meio): ALTER TABLE employees ADD COLUMN userId + unique + FK.
-- ============================================================

-- DropIndex (índices órfãos no schema)
DROP INDEX IF EXISTS "renovations_condominiumId_idx";
DROP INDEX IF EXISTS "stock_items_condominiumId_idx";
DROP INDEX IF EXISTS "tickets_condominiumId_idx";

-- DropTable (audit_logs_partitioned já está vazia em prod conforme
-- verificação manual de 2026-05-13: SELECT COUNT(*) retornou 0)
DROP TABLE IF EXISTS "audit_logs_partitioned";

-- CreateTable
CREATE TABLE IF NOT EXISTS "visitor_qrcodes" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorDoc" TEXT,
    "visitorPhone" TEXT,
    "reason" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_qrcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "visitor_qrcode_uses" (
    "id" TEXT NOT NULL,
    "qrcodeId" TEXT NOT NULL,
    "visitorId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedBy" TEXT NOT NULL,

    CONSTRAINT "visitor_qrcode_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "condominium_contracts" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "adjustmentIndex" TEXT,
    "fileUrl" TEXT,
    "notes" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominium_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "fines" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "regulation" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "amount" DECIMAL(10,2) NOT NULL,
    "appealDeadline" TIMESTAMP(3) NOT NULL,
    "appealText" TEXT,
    "appealedAt" TIMESTAMP(3),
    "appealStatus" TEXT,
    "appealResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "collection_rules" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "collection_steps" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "daysAfterDue" INTEGER NOT NULL,
    "channels" TEXT[],
    "messageTemplate" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'notify',

    CONSTRAINT "collection_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "digital_signage_screens" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slideDuration" INTEGER NOT NULL DEFAULT 8,
    "primaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_signage_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "digital_signage_slides" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_signage_slides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "visitor_qrcodes_token_key" ON "visitor_qrcodes"("token");
CREATE INDEX IF NOT EXISTS "condominium_contracts_condominiumId_idx" ON "condominium_contracts"("condominiumId");
CREATE INDEX IF NOT EXISTS "fines_condominiumId_status_createdAt_idx" ON "fines"("condominiumId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "fines_unitId_idx" ON "fines"("unitId");
CREATE INDEX IF NOT EXISTS "collection_rules_condominiumId_isActive_idx" ON "collection_rules"("condominiumId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "digital_signage_screens_token_key" ON "digital_signage_screens"("token");
CREATE INDEX IF NOT EXISTS "digital_signage_screens_condominiumId_idx" ON "digital_signage_screens"("condominiumId");

-- AddForeignKey (DO blocks tornam idempotente — em ambiente que já
-- tem o constraint, simplesmente pula)
DO $$ BEGIN
  ALTER TABLE "visitor_qrcodes" ADD CONSTRAINT "visitor_qrcodes_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "visitor_qrcode_uses" ADD CONSTRAINT "visitor_qrcode_uses_qrcodeId_fkey" FOREIGN KEY ("qrcodeId") REFERENCES "visitor_qrcodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "condominium_contracts" ADD CONSTRAINT "condominium_contracts_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "fines" ADD CONSTRAINT "fines_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "collection_rules" ADD CONSTRAINT "collection_rules_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "collection_steps" ADD CONSTRAINT "collection_steps_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "collection_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "digital_signage_screens" ADD CONSTRAINT "digital_signage_screens_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "digital_signage_slides" ADD CONSTRAINT "digital_signage_slides_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "digital_signage_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
