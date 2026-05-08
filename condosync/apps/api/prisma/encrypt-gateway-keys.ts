/**
 * Script de re-cifragem de gatewayKey/gatewayConfig em rows existentes.
 *
 * Uso:
 *   npm run encrypt:gateway-keys -- --dry-run    # apenas relatório
 *   npm run encrypt:gateway-keys -- --apply      # cifra e zera plaintext
 *
 * Idempotente: rows que já têm gatewayKeyEnc são ignoradas. Plaintext
 * antigo é zerado APENAS após confirmação de que Enc grava OK.
 *
 * Roda em batches de 50 com pause 100ms entre batches para não
 * travar o DB.
 */
import { PrismaClient } from "@prisma/client";
import { encrypt, encryptJson } from "../src/utils/cryptoVault";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");
const BATCH = 50;
const PAUSE_MS = 100;

if (!DRY_RUN && !APPLY) {
  console.error("Uso: encrypt-gateway-keys.ts --dry-run | --apply");
  process.exit(1);
}

async function main() {
  console.log(
    `🔐 ${DRY_RUN ? "DRY-RUN" : "APLICANDO"} re-encryption de gateway keys`,
  );

  const candidates = await prisma.financialAccount.findMany({
    where: {
      OR: [
        { gatewayKey: { not: null }, gatewayKeyEnc: null },
        { gatewayConfig: { not: null }, gatewayConfigEnc: null } as never,
      ],
    },
    select: {
      id: true,
      name: true,
      condominiumId: true,
      gatewayKey: true,
      gatewayConfig: true,
      gatewayKeyEnc: true,
      gatewayConfigEnc: true,
    },
  });

  console.log(`📊 ${candidates.length} financial_accounts a processar.`);

  if (DRY_RUN) {
    for (const a of candidates) {
      console.log(
        `  - account=${a.id} condo=${a.condominiumId} hasKey=${!!a.gatewayKey} hasConfig=${!!a.gatewayConfig}`,
      );
    }
    console.log("✅ Dry-run completo. Use --apply para executar.");
    return;
  }

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (a) => {
        try {
          const update: Record<string, unknown> = {};
          if (a.gatewayKey && !a.gatewayKeyEnc) {
            update.gatewayKeyEnc = encrypt(a.gatewayKey);
            update.gatewayKey = null; // zera plaintext após cifrar
          }
          if (a.gatewayConfig && !a.gatewayConfigEnc) {
            update.gatewayConfigEnc = encryptJson(a.gatewayConfig);
            update.gatewayConfig = undefined;
          }
          if (Object.keys(update).length > 0) {
            await prisma.financialAccount.update({
              where: { id: a.id },
              data: update,
            });
            processed++;
          }
        } catch (err) {
          errors++;
          console.error(`❌ erro em account=${a.id}:`, err);
        }
      }),
    );
    if (i + BATCH < candidates.length) {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }

  console.log(`✅ Concluído. processed=${processed} errors=${errors}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
