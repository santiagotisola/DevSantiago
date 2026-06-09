/**
 * Seed: Popula ~101 moradores nas 70 unidades do condomínio principal
 * Idempotente: verifica antes de criar
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Ana","Bruno","Carla","Diego","Elena","Felipe","Gabriela","Hugo","Isabela","João",
  "Karen","Lucas","Maria","Nicolas","Olivia","Paulo","Quiteria","Rafael","Sabrina","Thiago",
  "Ursula","Victor","Wanda","Xavier","Yara","Zeca","Alice","Bernardo","Camila","Daniel",
  "Eduarda","Fabio","Giovana","Henrique","Iris","Julio","Katia","Leonardo","Mariana","Nathan",
  "Olga","Pedro","Queila","Ricardo","Sofia","Tania","Umberto","Vanessa","William","Ximena",
  "Yasmin","Augusto","Beatriz","Carlos","Denise","Eduardo","Fatima","Gustavo","Helena","Igor",
  "Juliana","Kleber","Larissa","Marcos","Nadia","Osvaldo","Patricia","Quirino","Roberto","Sandra",
  "Tiago","Ursula","Valeria","Wellington","Ximenes","Yolanda","Zanele","Andre","Bruna","Cesar"
];

const LAST_NAMES = [
  "Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Ferreira","Rodrigues","Almeida",
  "Nascimento","Carvalho","Freitas","Gomes","Martins","Rocha","Ribeiro","Araújo","Melo","Barbosa",
  "Cardoso","Dias","Castro","Monteiro","Nunes","Pinto","Teixeira","Ramos","Machado","Correia"
];

function randomName(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[index % LAST_NAMES.length];
  const last2 = LAST_NAMES[(index + 5) % LAST_NAMES.length];
  return `${first} ${last} ${last2}`;
}

function randomCPF(index) {
  const base = String(index + 10000000000).padStart(11, "0").slice(-11);
  return base;
}

async function main() {
  console.log("🌱 Seed: Moradores das 70 unidades\n");

  const condo = await prisma.condominium.findFirst({ orderBy: { createdAt: "asc" } });
  if (!condo) throw new Error("Nenhum condomínio encontrado.");
  console.log(`Condomínio: ${condo.name} (${condo.id})`);

  const units = await prisma.unit.findMany({
    where: { condominiumId: condo.id },
    orderBy: { identifier: "asc" },
  });

  console.log(`Unidades encontradas: ${units.length}`);

  const passwordHash = await bcrypt.hash("Morador@2026", 10);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];

    // Verifica se unidade já tem morador vinculado
    const existing = await prisma.condominiumUser.findFirst({
      where: { condominiumId: condo.id, unitId: unit.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const email = `morador${i + 1}@veredasdobosque.com.br`;
    const name = randomName(i);
    const cpf = randomCPF(i + 200);

    // Cria ou busca usuário
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          cpf,
          role: "RESIDENT",
          isActive: true,
          emailVerified: true,
        },
      });
    }

    // Vincula ao condomínio na unidade
    await prisma.condominiumUser.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        unitId: unit.id,
        role: "RESIDENT",
        isActive: true,
      },
    });

    created++;
    if (created % 10 === 0) process.stdout.write(`  ✅ ${created} moradores criados...\n`);
  }

  console.log(`\n✅ Concluído!`);
  console.log(`  Criados: ${created}`);
  console.log(`  Pulados (já existiam): ${skipped}`);
  console.log(`\n  Senha de todos: Morador@2026`);
  console.log(`  Email padrão:  moradorN@veredasdobosque.com.br`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
