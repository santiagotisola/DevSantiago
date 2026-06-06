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

-- AddForeignKey
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
