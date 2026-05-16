import { WASocket, proto } from "@whiskeysockets/baileys";
import { WhatsAppSessionModel } from "../models/session.model";
import { WhatsAppMessageModel } from "../models/message.model";
import { enviarMensagem } from "../services/baileys.service";
import { EstadoWhatsApp } from "../types/whatsapp.types";
import { prisma } from "../../../config/prisma";
import * as VisitanteService from "../services/visitante.service";

function extractPhone(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
}

function extractText(msg: proto.IWebMessageInfo): string | null {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    null
  );
}

export async function processarMensagem(sock: WASocket, msg: proto.IWebMessageInfo) {
  if (!msg.key?.remoteJid) return;
  const phone = extractPhone(msg.key.remoteJid);
  const texto = extractText(msg);
  if (!texto) return;

  // Salvar mensagem recebida
  await WhatsAppMessageModel.create({
    sessionId: phone,
    direcao: "entrada",
    conteudo: texto,
    tipo: "texto",
    criadoEm: new Date(),
  });

  // Buscar ou criar sessão
  let sessao = await WhatsAppSessionModel.findOne({ phone, ativo: true });
  if (!sessao) {
    sessao = await WhatsAppSessionModel.create({
      phone,
      nome: "",
      estado: "inicio",
      dadosParciais: {},
      ultimaMensagem: new Date(),
      ativo: true,
      criadoEm: new Date(),
    });
  }

  sessao.ultimaMensagem = new Date();
  let resposta = "";

  // Máquina de estados
  switch (sessao.estado as EstadoWhatsApp) {
    case "inicio":
      resposta = `Olá! 👋 Bem-vindo ao CondoSync!\n\nPara registrar sua visita, preciso de algumas informações.\n\nQual é o seu *nome completo*?`;
      sessao.estado = "identificacao";
      break;

    case "identificacao":
      sessao.dadosParciais = { ...sessao.dadosParciais, nome: texto.trim() };
      resposta = `Olá, *${texto.trim()}*! 😊\n\nQual é o número da *unidade* que você deseja visitar?\n_(Ex: 101, 202, Torre A - 304)_`;
      sessao.estado = "unidade";
      break;

    case "unidade": {
      const unidadeTexto = texto.trim();
      // Verificar se unidade existe
      const unidade = await prisma.unit.findFirst({
        where: {
          identifier: { contains: unidadeTexto, mode: "insensitive" },
        },
      });

      if (!unidade) {
        resposta = `❌ Unidade *${unidadeTexto}* não encontrada.\nVerifique e tente novamente.\n\nDigite o número da unidade:`;
        break;
      }

      sessao.dadosParciais = { ...sessao.dadosParciais, unidade: unidadeTexto };
      resposta = `✅ Unidade *${unidadeTexto}* encontrada!\n\nQual é o *motivo* da sua visita?\n_(Ex: Visita familiar, Manutenção, Entrega)_`;
      sessao.estado = "motivo";
      break;
    }

    case "motivo": {
      sessao.dadosParciais = { ...sessao.dadosParciais, motivo: texto.trim() };

      // Buscar unidade
      const condominiumId = process.env.WHATSAPP_CONDOMINIUM_ID || "1";
      const unidade = await VisitanteService.buscarUnidadePorIdentificador(
        sessao.dadosParciais.unidade!,
        condominiumId
      );

      if (!unidade) {
        resposta = `❌ Unidade não encontrada. Por favor, tente novamente.`;
        break;
      }

      // Criar visita com todos os dados
      const visita = await VisitanteService.criarVisita(
        {
          name: sessao.dadosParciais.nome!,
          phone: phone,
          document: `WHATSAPP-${phone}`,
          documentType: "PHONE",
        },
        unidade.id,
        sessao.dadosParciais.motivo!,
        condominiumId
      );

      // Notificar moradores da unidade
      const moradores = await VisitanteService.obterMoradoresUnidade(unidade.id);
      for (const morador of moradores) {
        if (morador.user?.phone) {
          const msgMorador = `📱 *Novo visitante*\n\nNome: ${sessao.dadosParciais.nome}\nMotivo: ${sessao.dadosParciais.motivo}\nHorário: ${new Date().toLocaleTimeString("pt-BR")}\n\nAprovação pendente. Contacte a portaria.`;
          // TODO: Enviar SMS ou notificação push
        }
      }

      resposta = `✅ *Visita registrada com sucesso!*\n\n📋 Resumo:\n• Nome: ${sessao.dadosParciais.nome}\n• Unidade: ${sessao.dadosParciais.unidade}\n• Motivo: ${sessao.dadosParciais.motivo}\n• ID: ${visita.id}\n• Horário: ${new Date().toLocaleTimeString("pt-BR")}\n\nO porteiro foi notificado. Por favor, aguarde na recepção. 🏢`;

      // Resetar sessão
      sessao.estado = "inicio";
      sessao.dadosParciais = {};
      break;
    }
  }

  await sessao.save();

  // Salvar resposta
  await WhatsAppMessageModel.create({
    sessionId: phone,
    direcao: "saida",
    conteudo: resposta,
    tipo: "texto",
    criadoEm: new Date(),
  });

  // Enviar resposta
  await enviarMensagem(phone, resposta);
}
