ALTER TABLE "refresh_tokens" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
