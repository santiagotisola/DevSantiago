/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "visitor_qrcodes" (
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
CREATE TABLE "visitor_qrcode_uses" (
    "id" TEXT NOT NULL,
    "qrcodeId" TEXT NOT NULL,
    "visitorId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedBy" TEXT NOT NULL,

    CONSTRAINT "visitor_qrcode_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condominium_contracts" (
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
CREATE TABLE "fines" (
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
CREATE TABLE "collection_rules" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_steps" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "daysAfterDue" INTEGER NOT NULL,
    "channels" TEXT[],
    "messageTemplate" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'notify',

    CONSTRAINT "collection_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_signage_screens" (
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
CREATE TABLE "digital_signage_slides" (
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
CREATE UNIQUE INDEX "visitor_qrcodes_token_key" ON "visitor_qrcodes"("token");

-- CreateIndex
CREATE UNIQUE INDEX "digital_signage_screens_token_key" ON "digital_signage_screens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_qrcodes" ADD CONSTRAINT "visitor_qrcodes_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_qrcode_uses" ADD CONSTRAINT "visitor_qrcode_uses_qrcodeId_fkey" FOREIGN KEY ("qrcodeId") REFERENCES "visitor_qrcodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_steps" ADD CONSTRAINT "collection_steps_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "collection_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signage_slides" ADD CONSTRAINT "digital_signage_slides_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "digital_signage_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
