-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ASSEMBLY';

-- CreateTable
CREATE TABLE "assemblies" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "meetingUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "minutesUrl" TEXT,
    "status" "AssemblyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_voting_items" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL,

    CONSTRAINT "assembly_voting_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_votes" (
    "id" TEXT NOT NULL,
    "votingItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assembly_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_attendees" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "assembly_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assembly_votes_votingItemId_userId_key" ON "assembly_votes"("votingItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "assembly_attendees_assemblyId_userId_key" ON "assembly_attendees"("assemblyId", "userId");

-- AddForeignKey
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_voting_items" ADD CONSTRAINT "assembly_voting_items_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_votes" ADD CONSTRAINT "assembly_votes_votingItemId_fkey" FOREIGN KEY ("votingItemId") REFERENCES "assembly_voting_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_attendees" ADD CONSTRAINT "assembly_attendees_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
