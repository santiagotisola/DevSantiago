import { Request, Response } from "express";
import { z } from "zod";
import * as BaileysService from "./services/baileys.service";
import { WhatsAppSessionModel } from "./models/session.model";
import { WhatsAppMessageModel } from "./models/message.model";
import * as VisitanteService from "./services/visitante.service";
import { prisma } from "../../config/prisma";

export async function iniciar(req: Request, res: Response) {
  const status = BaileysService.getStatus();
  if (status === "conectado") {
    return res.json({ message: "WhatsApp já está conectado", status });
  }
  await BaileysService.iniciarWhatsApp();
  return res.json({ message: "Iniciando WhatsApp...", status: BaileysService.getStatus() });
}

export async function getStatus(req: Request, res: Response) {
  return res.json({ status: BaileysService.getStatus() });
}

export async function getQR(req: Request, res: Response) {
  const qr = BaileysService.getQRCode();
  const status = BaileysService.getStatus();
  if (!qr) {
    return res.json({ qr: null, status, message: "QR Code não disponível" });
  }
  return res.json({ qr, status });
}

export async function listarSessoes(req: Request, res: Response) {
  const sessoes = await WhatsAppSessionModel.find({ ativo: true })
    .sort({ ultimaMensagem: -1 })
    .limit(50)
    .lean();
  return res.json({ sessoes, total: sessoes.length });
}

export async function getSessao(req: Request, res: Response) {
  const { phone } = req.params;
  const sessao = await WhatsAppSessionModel.findOne({ phone }).lean();
  if (!sessao) return res.status(404).json({ error: "Sessão não encontrada" });

  const mensagens = await WhatsAppMessageModel.find({ sessionId: phone })
    .sort({ criadoEm: -1 })
    .limit(20)
    .lean();

  return res.json({ sessao, mensagens });
}

export async function enviar(req: Request, res: Response) {
  const schema = z.object({
    para: z.string().min(8),
    mensagem: z.string().min(1).max(1000),
  });

  const { para, mensagem } = schema.parse(req.body);
  await BaileysService.enviarMensagem(para, mensagem);
  return res.json({ ok: true, para, mensagem });
}

export async function listarUnidades(req: Request, res: Response) {
  const condominiumId = process.env.WHATSAPP_CONDOMINIUM_ID || "1";
  
  const unidades = await VisitanteService.listarUnidadesCondominio(condominiumId);
  
  return res.json({ 
    ok: true, 
    total: unidades.length,
    unidades 
  });
}

export async function listarVisitas(req: Request, res: Response) {
  const condominiumId = process.env.WHATSAPP_CONDOMINIUM_ID || "1";
  
  // Listar visitações criadas via WhatsApp (documento contém WHATSAPP-)
  const visitas = await prisma.visitor.findMany({
    where: {
      document: { startsWith: "WHATSAPP-" },
      unit: {
        condominiumId: condominiumId,
      },
    },
    include: {
      unit: {
        select: {
          identifier: true,
          block: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
  
  return res.json({ 
    ok: true, 
    total: visitas.length,
    visitas 
  });
}

export async function atualizarStatusVisita(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  
  const statusValido = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"];
  if (!statusValido.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  
  const visita = await VisitanteService.atualizarStatusVisita(id, status);
  
  return res.json({ 
    ok: true, 
    message: `Visita atualizada para ${status}`,
    visita 
  });
}

export async function desconectar(req: Request, res: Response) {
  await BaileysService.desconectar();
  return res.json({ ok: true, message: "WhatsApp desconectado" });
}

export async function broadcast(req: Request, res: Response) {
  const schema = z.object({
    group: z.enum(["ALL", "OVERDUE", "UNIT"]),
    unitId: z.string().optional(),
    template: z.string().min(1).max(2000),
  });

  const { group, unitId, template } = schema.parse(req.body);
  const condominiumId = process.env.WHATSAPP_CONDOMINIUM_ID || "1";

  // Buscar moradores baseado no grupo
  let residents: { name: string; phone: string | null; unit?: { identifier: string } }[] = [];

  if (group === "ALL") {
    residents = await prisma.resident.findMany({
      where: { unit: { condominiumId } },
      select: { name: true, phone: true, unit: { select: { identifier: true } } },
    });
  } else if (group === "UNIT" && unitId) {
    residents = await prisma.resident.findMany({
      where: { unitId },
      select: { name: true, phone: true, unit: { select: { identifier: true } } },
    });
  } else if (group === "OVERDUE") {
    // Buscar moradores com cobranças vencidas
    const overdue = await prisma.charge.findMany({
      where: {
        status: "OVERDUE",
        unit: { condominiumId },
      },
      select: {
        amount: true,
        unit: {
          select: {
            identifier: true,
            residents: {
              select: { name: true, phone: true },
              where: { isOwner: true },
              take: 1,
            },
          },
        },
      },
    });
    residents = overdue
      .filter((c) => c.unit.residents.length > 0)
      .map((c) => ({
        name: c.unit.residents[0].name,
        phone: c.unit.residents[0].phone,
        unit: { identifier: c.unit.identifier },
      }));
  }

  // Filtrar moradores com telefone válido
  const destinatarios = residents.filter((r) => r.phone && r.phone.length >= 10);

  let sent = 0;
  let failed = 0;
  const details: { name: string; phone: string; status: string }[] = [];

  // Enviar com delay de 2s entre cada (anti-ban)
  for (const dest of destinatarios) {
    const mensagem = template
      .replace(/\{\{nome\}\}/g, dest.name)
      .replace(/\{\{unidade\}\}/g, dest.unit?.identifier || "")
      .replace(/\{\{valor\}\}/g, "");

    try {
      await BaileysService.enviarMensagem(dest.phone!, mensagem);
      sent++;
      details.push({ name: dest.name, phone: dest.phone!, status: "sent" });
    } catch {
      failed++;
      details.push({ name: dest.name, phone: dest.phone!, status: "failed" });
    }

    // Delay de 2s entre envios (anti-ban WhatsApp)
    if (destinatarios.indexOf(dest) < destinatarios.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return res.json({ ok: true, sent, failed, total: destinatarios.length, details });
}
