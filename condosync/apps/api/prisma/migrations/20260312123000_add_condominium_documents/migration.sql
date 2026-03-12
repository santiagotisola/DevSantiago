CREATE TABLE "condominium_documents" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "condominium_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "condominium_documents_condominiumId_idx" ON "condominium_documents"("condominiumId");

ALTER TABLE "condominium_documents"
ADD CONSTRAINT "condominium_documents_condominiumId_fkey"
FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
