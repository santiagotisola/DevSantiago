-- CreateEnum
CREATE TYPE "LostAndFoundStatus" AS ENUM ('LOST', 'FOUND', 'RETURNED', 'DISCARDED');

-- CreateTable
CREATE TABLE "lost_and_found" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "place" TEXT,
    "status" "LostAndFoundStatus" NOT NULL DEFAULT 'FOUND',
    "photoUrl" TEXT,
    "foundDate" TIMESTAMP(3),
    "lostDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnedTo" TEXT,
    "condominiumId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lost_and_found_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lost_and_found" ADD CONSTRAINT "lost_and_found_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_and_found" ADD CONSTRAINT "lost_and_found_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
