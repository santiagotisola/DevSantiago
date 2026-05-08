/**
 * Manutenção de partições de tabelas append-only.
 *
 * Funções:
 *  1. createUpcomingPartitions: cria partições para os próximos N
 *     meses (default 3) — roda mensalmente.
 *  2. archiveOldPartitions: detacha + dropa partições mais antigas
 *     que retentionMonths (default 12) — roda mensalmente após
 *     backup.
 *  3. listOrphanRows: conta rows na partição default (catch-all);
 *     >0 indica partição faltando.
 *
 * Uso:
 *   npm run partitions:create -- --table=audit_logs_partitioned --months-ahead=3
 *   npm run partitions:archive -- --table=audit_logs_partitioned --retention=12
 *   npm run partitions:check -- --table=audit_logs_partitioned
 *
 * Idealmente: cron mensal no Railway (0 3 1 * * = dia 1 03:00 UTC).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstOfNextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

function partitionName(table: string, d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  // Convenção: <table>_YYYY_MM (sem o sufixo _partitioned).
  const base = table.replace(/_partitioned$/, "");
  return `${base}_${yyyy}_${mm}`;
}

async function createUpcomingPartitions(table: string, monthsAhead: number) {
  let created = 0;
  for (let i = 0; i < monthsAhead; i++) {
    const start = firstOfNextMonth(new Date());
    start.setUTCMonth(start.getUTCMonth() + i);
    const end = firstOfNextMonth(start);
    const name = partitionName(table, start);
    const exists = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = '${name}') AS exists`,
    );
    if (exists[0]?.exists) {
      console.log(`  · ${name} já existe`);
      continue;
    }
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "${name}" PARTITION OF "${table}" FOR VALUES FROM ('${ymd(start)}') TO ('${ymd(end)}');`,
    );
    console.log(`  ✅ criada partição ${name}`);
    created++;
  }
  console.log(`Total criado: ${created}`);
}

async function archiveOldPartitions(table: string, retentionMonths: number) {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);
  cutoff.setUTCDate(1);
  cutoff.setUTCHours(0, 0, 0, 0);

  // Lista partições filhas
  const parts = await prisma.$queryRawUnsafe<
    { partition_name: string; partition_expression: string }[]
  >(`
    SELECT
      child.relname AS partition_name,
      pg_get_expr(child.relpartbound, child.oid) AS partition_expression
    FROM pg_inherits
    JOIN pg_class parent ON parent.oid = inhparent
    JOIN pg_class child ON child.oid = inhrelid
    WHERE parent.relname = '${table}'
    ORDER BY child.relname
  `);

  let archived = 0;
  for (const p of parts) {
    if (p.partition_name.endsWith("_default")) continue;
    // Heurística: extrai YYYY_MM do nome.
    const m = /(\d{4})_(\d{2})$/.exec(p.partition_name);
    if (!m) continue;
    const [_, y, mo] = m;
    const partStart = new Date(Date.UTC(Number(y), Number(mo) - 1, 1));
    if (partStart < cutoff) {
      // Detach (mantém table, mas tira da família — backup possível)
      // depois drop. Em prod, considerar mover para S3 via pg_dump
      // antes do drop.
      console.log(
        `  📦 arquivando ${p.partition_name} (${ymd(partStart)} < cutoff ${ymd(cutoff)})`,
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" DETACH PARTITION "${p.partition_name}";`,
      );
      // Em prod: pg_dump -t ${p.partition_name} | gzip | aws s3 cp ...
      // antes do DROP. Aqui apenas dropamos.
      await prisma.$executeRawUnsafe(
        `DROP TABLE "${p.partition_name}";`,
      );
      archived++;
    }
  }
  console.log(`Total arquivado: ${archived}`);
}

async function checkOrphans(table: string) {
  const defaultPart = `${table.replace(/_partitioned$/, "")}_default`;
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) AS count FROM "${defaultPart}"`,
  );
  const count = Number(result[0]?.count ?? 0);
  console.log(`${defaultPart}: ${count} rows`);
  if (count > 0) {
    console.error(
      `⚠️  ${count} rows em partição default — possível partição faltando para mês corrente`,
    );
    process.exit(2);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const op = args[0]; // create | archive | check
  const table =
    args.find((a) => a.startsWith("--table="))?.split("=")[1] ?? "audit_logs_partitioned";
  const monthsAhead = Number(
    args.find((a) => a.startsWith("--months-ahead="))?.split("=")[1] ?? 3,
  );
  const retention = Number(
    args.find((a) => a.startsWith("--retention="))?.split("=")[1] ?? 12,
  );

  if (op === "create") await createUpcomingPartitions(table, monthsAhead);
  else if (op === "archive") await archiveOldPartitions(table, retention);
  else if (op === "check") await checkOrphans(table);
  else {
    console.error(
      "Uso: partition-maintenance.ts <create|archive|check> [--table=...] [--months-ahead=N] [--retention=N]",
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
