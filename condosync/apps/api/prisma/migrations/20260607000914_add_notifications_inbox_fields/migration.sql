-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


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

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "condominiumId" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT;

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_condominiumId_idx" ON "notifications"("condominiumId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
