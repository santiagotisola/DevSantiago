import { prisma } from "../../../config/prisma";

export async function buscarVisitantePorTelefone(telefone: string) {
  // Busca visitantes recentes com este telefone
  const visitantes = await prisma.visitor.findMany({
    where: {
      phone: telefone,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return visitantes;
}

export async function listarUnidadesCondominio(condominiumId: string) {
  const unidades = await prisma.unit.findMany({
    where: {
      condominiumId: condominiumId,
    },
    select: {
      id: true,
      identifier: true,
      block: true,
      floor: true,
      type: true,
      status: true,
    },
    orderBy: {
      identifier: "asc",
    },
  });

  return unidades;
}

export async function buscarUnidadePorIdentificador(
  identifier: string,
  condominiumId: string
) {
  const unidade = await prisma.unit.findFirst({
    where: {
      identifier: { contains: identifier, mode: "insensitive" },
      condominiumId: condominiumId,
    },
    include: {
      residents: {
        select: {
          id: true,
          user: {
            select: {
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return unidade;
}

export async function criarVisita(
  visitante: any,
  unidadeId: string,
  motivo: string,
  condominiumId: string
) {
  const visita = await prisma.visitor.create({
    data: {
      name: visitante.name,
      phone: visitante.phone,
      document: visitante.document,
      documentType: visitante.documentType,
      reason: motivo,
      unitId: unidadeId,
      status: "PENDING",
      entryAt: new Date(),
    },
  });

  return visita;
}

export async function obterMoradoresUnidade(unidadeId: string) {
  const unidade = await prisma.unit.findUnique({
    where: { id: unidadeId },
    include: {
      residents: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return unidade?.residents || [];
}

export async function atualizarStatusVisita(visitaId: string, status: string) {
  const visita = await prisma.visitor.update({
    where: { id: visitaId },
    data: { status: status as any },
  });

  return visita;
}
