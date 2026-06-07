/*
  Warnings:

  - You are about to drop the column `description` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `module` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `entity` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "description",
DROP COLUMN "entityType",
DROP COLUMN "ipAddress",
DROP COLUMN "module",
DROP COLUMN "userAgent",
ADD COLUMN     "changes" JSONB,
ADD COLUMN     "entity" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_condominiumId_idx" ON "audit_logs"("condominiumId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
