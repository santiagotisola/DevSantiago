-- TermsVersion
CREATE TABLE "terms_versions" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terms_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "terms_versions_kind_version_key" ON "terms_versions"("kind", "version");
CREATE INDEX "terms_versions_kind_effectiveAt_idx" ON "terms_versions"("kind", "effectiveAt");

-- TermsAcceptance
CREATE TABLE "terms_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersionId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "terms_acceptances_userId_termsVersionId_key" ON "terms_acceptances"("userId", "termsVersionId");
CREATE INDEX "terms_acceptances_userId_idx" ON "terms_acceptances"("userId");
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_termsVersionId_fkey"
    FOREIGN KEY ("termsVersionId") REFERENCES "terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed inicial: termos genéricos versão 1.0.0. Cliente DEVE customizar
-- com jurídico antes de produção (este texto é placeholder).
INSERT INTO "terms_versions" ("id", "kind", "version", "contentMd", "effectiveAt", "createdAt")
VALUES
  (gen_random_uuid(), 'terms_of_use', '1.0.0',
   E'# Termos de Uso\n\nAo usar o CondoSync, você concorda em:\n\n- Usar a plataforma apenas para gestão lícita do seu condomínio.\n- Não compartilhar credenciais com terceiros.\n- Manter os dados de moradores atualizados.\n\nA empresa pode suspender contas por uso indevido. Termos sujeitos a atualização — usuários serão notificados.\n',
   NOW(), NOW()),
  (gen_random_uuid(), 'privacy_policy', '1.0.0',
   E'# Política de Privacidade\n\nO CondoSync coleta e processa dados pessoais conforme a LGPD (Lei 13.709/2018).\n\n## Dados coletados\n- Identificação: nome, e-mail, CPF, telefone.\n- Uso: logs de acesso, IPs, dispositivos.\n- Operacional: encomendas, visitantes, cobranças.\n\n## Direitos do titular\n- Acesso aos dados (export em /perfil/lgpd/export).\n- Correção via /perfil.\n- Anonimização ("direito ao esquecimento") via solicitação ao admin do condomínio.\n\n## Retenção\nDados financeiros: 5 anos (obrigação fiscal).\nDados operacionais: até inativação da conta.\nLogs de auditoria: 180 dias.\n\nDPO: dpo@condosync.com.br\n',
   NOW(), NOW())
ON CONFLICT ("kind", "version") DO NOTHING;
