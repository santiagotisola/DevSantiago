const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  try {
    // Busca o condomínio principal
    const condo = await prisma.condominium.findFirst({ 
      orderBy: { createdAt: "asc" } 
    });
    
    if (!condo) {
      console.error("❌ Banco não inicializado. Rode seed-base primeiro.");
      process.exit(1);
    }

    console.log(`Condomínio encontrado: ${condo.name}`);

    const email = "santiagoti_sola@hotmail.com";
    const password = "Acesso@2026";
    const passwordHash = await bcrypt.hash(password, 12);

    // Cria ou atualiza o usuário
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        name: "Santiago Tísola",
        passwordHash,
        role: "RESIDENT",
        isActive: true,
        emailVerified: true,
      },
    });

    console.log(`✅ Usuário criado/atualizado: ${user.email}`);

    // Busca uma unidade para associar
    const unit = await prisma.unit.findFirst({
      where: { condominiumId: condo.id },
    });

    // Verifica se já está associado ao condomínio
    const existing = await prisma.condominiumUser.findFirst({
      where: { userId: user.id, condominiumId: condo.id },
    });

    if (!existing) {
      await prisma.condominiumUser.create({
        data: {
          userId: user.id,
          condominiumId: condo.id,
          role: "RESIDENT",
          isActive: true,
          unitId: unit?.id,
        },
      });
      console.log("✅ Usuário associado ao condomínio.");
    } else {
      console.log("ℹ️  Usuário já estava associado ao condomínio.");
    }

    console.log("\n📋 Credenciais de acesso:");
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Senha: ${password}`);
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
