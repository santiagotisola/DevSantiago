const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Busca o condomínio principal
  const condo = await prisma.condominium.findFirst({ orderBy: { createdAt: "asc" } });
  if (!condo) throw new Error("Nenhum condomínio encontrado. Rode o seed-base primeiro.");

  console.log(`Condomínio: ${condo.name} (${condo.id})`);

  const email = "atendimentoveredasbosque@gmail.com";
  const password = "Crvb@2026";
  const passwordHash = await bcrypt.hash(password, 12);

  // Cria ou atualiza o usuário
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Atendimento Veredas do Bosque", role: "CONDOMINIUM_ADMIN" },
    create: {
      email,
      passwordHash,
      name: "Atendimento Veredas do Bosque",
      role: "CONDOMINIUM_ADMIN",
      isActive: true,
    },
  });

  console.log(`Usuário criado/atualizado: ${user.email} | Role: ${user.role} | ID: ${user.id}`);

  // Associa ao condomínio se ainda não estiver
  const existing = await prisma.condominiumUser.findFirst({
    where: { userId: user.id, condominiumId: condo.id },
  });

  if (!existing) {
    await prisma.condominiumUser.create({
      data: {
        userId: user.id,
        condominiumId: condo.id,
        role: "CONDOMINIUM_ADMIN",
        isActive: true,
      },
    });
    console.log("Usuário associado ao condomínio.");
  } else {
    console.log("Usuário já estava associado ao condomínio.");
  }

  console.log("\n✅ Pronto!");
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${password}`);
  console.log(`   Role: CONDOMINIUM_ADMIN`);
}

main()
  .catch((e) => { console.error("Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
