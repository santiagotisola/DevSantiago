DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketplaceOfferStatus') THEN
    CREATE TYPE "MarketplaceOfferStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UnitStatus' AND e.enumlabel = 'BLOCKED'
  ) THEN
    ALTER TYPE "UnitStatus" ADD VALUE 'BLOCKED';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "marketplace_partners" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "category" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "marketplace_offers" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "discount" TEXT,
  "couponCode" TEXT,
  "validUntil" TIMESTAMP(3),
  "status" "MarketplaceOfferStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketplace_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "panic_alerts" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "triggeredBy" TEXT NOT NULL,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "panic_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "visitor_recurrences" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "visitorName" TEXT NOT NULL,
  "document" TEXT,
  "documentType" TEXT,
  "company" TEXT,
  "reason" TEXT,
  "weekDays" TEXT[] NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visitor_recurrences_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_offers_partnerId_fkey') THEN
    ALTER TABLE "marketplace_offers"
    ADD CONSTRAINT "marketplace_offers_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'panic_alerts_condominiumId_fkey') THEN
    ALTER TABLE "panic_alerts"
    ADD CONSTRAINT "panic_alerts_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_recurrences_condominiumId_fkey') THEN
    ALTER TABLE "visitor_recurrences"
    ADD CONSTRAINT "visitor_recurrences_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_recurrences_unitId_fkey') THEN
    ALTER TABLE "visitor_recurrences"
    ADD CONSTRAINT "visitor_recurrences_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END
$$;
