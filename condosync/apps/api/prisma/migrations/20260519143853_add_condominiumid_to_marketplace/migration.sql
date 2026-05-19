/*
  Warnings:
  - Added condominiumId to marketplace tables (with data migration for existing rows)
*/

-- AlterTable: Add as nullable first
ALTER TABLE "marketplace_partners" ADD COLUMN "condominiumId" TEXT;
ALTER TABLE "marketplace_offers" ADD COLUMN "condominiumId" TEXT;

-- Data migration: assign existing rows to the first condominium found
UPDATE "marketplace_partners"
SET "condominiumId" = (SELECT id FROM "condominiums" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "condominiumId" IS NULL;

UPDATE "marketplace_offers"
SET "condominiumId" = (SELECT id FROM "condominiums" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "condominiumId" IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE "marketplace_partners" ALTER COLUMN "condominiumId" SET NOT NULL;
ALTER TABLE "marketplace_offers" ALTER COLUMN "condominiumId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "marketplace_partners" ADD CONSTRAINT "marketplace_partners_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
