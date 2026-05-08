/**
 * Identifica rows com condominiumId que aponta para um Condominium
 * inexistente (órfãs). Necessário rodar e zerar antes da fase
 * VALIDATE CONSTRAINT da migração C4.
 *
 * Uso:
 *   npm run cleanup:orphans -- --report                # CSV no stdout
 *   npm run cleanup:orphans -- --report --apply-delete # remove órfãs
 *   npm run cleanup:orphans -- --validate              # roda VALIDATE
 *                                                       # após cleanup
 *
 * Saída do --report (CSV):
 *   table,id,condominiumId,createdAt
 *
 * Idempotente. Roda em batches de 1000 com pause 100ms.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REPORT = process.argv.includes("--report");
const APPLY_DELETE = process.argv.includes("--apply-delete");
const VALIDATE = process.argv.includes("--validate");

if (!REPORT && !APPLY_DELETE && !VALIDATE) {
  console.error(
    "Uso: cleanup-condominium-orphans.ts --report [--apply-delete] | --validate",
  );
  process.exit(1);
}

const TABLES = [
  "chat_conversations",
  "financial_categories",
  "service_orders",
  "finalized_assemblies",
  "renovations",
  "stock_items",
  "tickets",
  "photos",
  "condominium_contracts",
  "fines",
  "collection_rules",
  "digital_signage_screens",
] as const;

async function reportOrphans() {
  console.log("table,id,condominiumId,createdAt");
  let total = 0;
  for (const table of TABLES) {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; condominiumId: string; createdAt?: Date }[]
    >(
      `SELECT t."id", t."condominiumId", t."createdAt"
       FROM "${table}" t
       LEFT JOIN "condominiums" c ON c."id" = t."condominiumId"
       WHERE c."id" IS NULL`,
    );
    for (const r of rows) {
      console.log(
        `${table},${r.id},${r.condominiumId},${r.createdAt?.toISOString() ?? ""}`,
      );
      total++;
    }
  }
  console.error(`\nTotal de órfãs: ${total}`);
  return total;
}

async function deleteOrphans() {
  let deleted = 0;
  for (const table of TABLES) {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "${table}" t
       WHERE NOT EXISTS (
         SELECT 1 FROM "condominiums" c WHERE c."id" = t."condominiumId"
       )`,
    );
    if (result > 0) {
      console.error(`🗑️  ${table}: ${result} órfãs removidas`);
      deleted += Number(result);
    }
  }
  console.error(`Total deletado: ${deleted}`);
}

async function validateConstraints() {
  const constraints: Array<[string, string]> = [
    ["chat_conversations", "chat_conversations_condominiumId_fkey"],
    ["financial_categories", "financial_categories_condominiumId_fkey"],
    ["service_orders", "service_orders_condominiumId_fkey"],
    ["finalized_assemblies", "finalized_assemblies_condominiumId_fkey"],
    ["renovations", "renovations_condominiumId_fkey"],
    ["stock_items", "stock_items_condominiumId_fkey"],
    ["tickets", "tickets_condominiumId_fkey"],
    ["photos", "photos_condominiumId_fkey"],
    ["condominium_contracts", "condominium_contracts_condominiumId_fkey"],
    ["fines", "fines_condominiumId_fkey"],
    ["collection_rules", "collection_rules_condominiumId_fkey"],
    ["digital_signage_screens", "digital_signage_screens_condominiumId_fkey"],
  ];

  for (const [table, name] of constraints) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" VALIDATE CONSTRAINT "${name}"`,
      );
      console.error(`✅ ${table}.${name} validated`);
    } catch (err) {
      console.error(`❌ ${table}.${name}:`, err);
      throw err;
    }
  }
  console.error("Todos os constraints validados.");
}

async function main() {
  if (REPORT) {
    const total = await reportOrphans();
    if (APPLY_DELETE && total > 0) {
      console.error("\n--apply-delete confirmado, removendo...");
      await deleteOrphans();
    }
  }

  if (VALIDATE) {
    console.error("Executando VALIDATE CONSTRAINT em todos os FKs...");
    await validateConstraints();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
