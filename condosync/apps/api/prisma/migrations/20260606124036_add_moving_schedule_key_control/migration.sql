-- CreateEnum
CREATE TYPE "MovingType" AS ENUM ('MOVE_IN', 'MOVE_OUT', 'LARGE_DELIVERY');

-- CreateEnum
CREATE TYPE "MovingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "KeyStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moving_schedules" ADD CONSTRAINT "moving_schedules_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moving_schedules" ADD CONSTRAINT "moving_schedules_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_controls" ADD CONSTRAINT "key_controls_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_control_logs" ADD CONSTRAINT "key_control_logs_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "key_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
