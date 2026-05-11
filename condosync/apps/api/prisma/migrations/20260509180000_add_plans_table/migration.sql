-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxUnits" INTEGER NOT NULL DEFAULT 100,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- Seed default plans (slugs já usados em Condominium.plan)
INSERT INTO "plans" ("id", "slug", "name", "description", "price", "maxUnits", "features", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'basic', 'Básico', 'Plano inicial para condomínios pequenos', 99.00, 50, '["Até 50 unidades","Suporte por email"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'professional', 'Profissional', 'Plano intermediário para condomínios médios', 249.00, 200, '["Até 200 unidades","Suporte prioritário","Relatórios avançados"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'enterprise', 'Enterprise', 'Plano completo para grandes condomínios', 599.00, 1000, '["Unidades ilimitadas (1000+)","Suporte 24/7","Integrações personalizadas"]'::jsonb, true, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;
