-- CreateEnum
CREATE TYPE "VisibilityMode" AS ENUM ('LOCAL', 'GLOBAL', 'SELECTIVE');

-- CreateEnum
CREATE TYPE "MarketplaceProductRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "MovingType" AS ENUM ('MOVE_IN', 'MOVE_OUT', 'LARGE_DELIVERY');

-- CreateEnum
CREATE TYPE "MovingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "KeyStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PANIC';
ALTER TYPE "NotificationType" ADD VALUE 'VISITOR_ARRIVAL';
ALTER TYPE "NotificationType" ADD VALUE 'PARCEL_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'ASSEMBLY_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'PANIC_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_STATUS';
ALTER TYPE "NotificationType" ADD VALUE 'GENERAL';

-- DropIndex
DROP INDEX "notifications_userId_isRead_createdAt_idx";

-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN     "heroImageUrl" TEXT;

-- AlterTable
ALTER TABLE "marketplace_offers" ADD COLUMN     "condominiumId" TEXT;

-- AlterTable
ALTER TABLE "marketplace_partners" ADD COLUMN     "condominiumId" TEXT,
ADD COLUMN     "createdByCondominiumId" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibilityMode" "VisibilityMode" NOT NULL DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "condominiumId" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT;

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "condominium_marketplace_partners" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "branchName" TEXT,
    "branchPhone" TEXT,
    "branchEmail" TEXT,
    "deliveryZone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominium_marketplace_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_products" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "category" TEXT,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_product_requests" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" "MarketplaceProductRequestStatus" NOT NULL DEFAULT 'PENDING',
    "quotedPrice" DECIMAL(10,2),
    "quotedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_chat_messages" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "images" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_favorites" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_points" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" "CustomerTier" NOT NULL DEFAULT 'BRONZE',
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_history" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_categories" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moving_schedules" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "MovingType" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "elevator" TEXT,
    "responsibleName" TEXT NOT NULL,
    "responsiblePhone" TEXT,
    "companyName" TEXT,
    "notes" TEXT,
    "status" "MovingStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "rejectedReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moving_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_controls" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "keyIdentifier" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "KeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_control_logs" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "borrowedBy" TEXT,
    "borrowedByUnit" TEXT,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_control_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "streamUrl" TEXT NOT NULL,
    "embedUrl" TEXT,
    "snapshotUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRecording" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "condominium_marketplace_partners_partnerId_condominiumId_key" ON "condominium_marketplace_partners"("partnerId", "condominiumId");

-- CreateIndex
CREATE INDEX "marketplace_products_partnerId_idx" ON "marketplace_products"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_products_condominiumId_idx" ON "marketplace_products"("condominiumId");

-- CreateIndex
CREATE INDEX "marketplace_product_requests_partnerId_idx" ON "marketplace_product_requests"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_product_requests_residentId_idx" ON "marketplace_product_requests"("residentId");

-- CreateIndex
CREATE INDEX "marketplace_product_requests_condominiumId_idx" ON "marketplace_product_requests"("condominiumId");

-- CreateIndex
CREATE INDEX "marketplace_chat_messages_requestId_idx" ON "marketplace_chat_messages"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_product_reviews_productId_residentId_key" ON "marketplace_product_reviews"("productId", "residentId");

-- CreateIndex
CREATE UNIQUE INDEX "resident_favorites_residentId_productId_key" ON "resident_favorites"("residentId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_points_residentId_key" ON "loyalty_points"("residentId");

-- CreateIndex
CREATE INDEX "purchase_history_residentId_idx" ON "purchase_history"("residentId");

-- CreateIndex
CREATE INDEX "purchase_history_partnerId_idx" ON "purchase_history"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_categories_condominiumId_idx" ON "marketplace_categories"("condominiumId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_condominiumId_slug_key" ON "marketplace_categories"("condominiumId", "slug");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_condominiumId_idx" ON "notifications"("condominiumId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_partners" ADD CONSTRAINT "marketplace_partners_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominium_marketplace_partners" ADD CONSTRAINT "condominium_marketplace_partners_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condominium_marketplace_partners" ADD CONSTRAINT "condominium_marketplace_partners_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_images" ADD CONSTRAINT "marketplace_product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_requests" ADD CONSTRAINT "marketplace_product_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_requests" ADD CONSTRAINT "marketplace_product_requests_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_requests" ADD CONSTRAINT "marketplace_product_requests_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_requests" ADD CONSTRAINT "marketplace_product_requests_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_chat_messages" ADD CONSTRAINT "marketplace_chat_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "marketplace_product_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_chat_messages" ADD CONSTRAINT "marketplace_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_reviews" ADD CONSTRAINT "marketplace_product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_reviews" ADD CONSTRAINT "marketplace_product_reviews_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_product_reviews" ADD CONSTRAINT "marketplace_product_reviews_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_favorites" ADD CONSTRAINT "resident_favorites_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_favorites" ADD CONSTRAINT "resident_favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "marketplace_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_categories" ADD CONSTRAINT "marketplace_categories_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moving_schedules" ADD CONSTRAINT "moving_schedules_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moving_schedules" ADD CONSTRAINT "moving_schedules_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_controls" ADD CONSTRAINT "key_controls_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_control_logs" ADD CONSTRAINT "key_control_logs_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "key_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
