-- ============================================================
-- Migration manual: vincula employees.userId -> users.id
-- Esta coluna já existe em produção e em ambiente local (foi
-- aplicada via prisma db push em algum momento prévio sem
-- migration formal). Esta migration apenas FORMALIZA o estado
-- atual usando IF NOT EXISTS/EXCEPTION para ser idempotente.
-- ============================================================

-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_key" ON "employees"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
