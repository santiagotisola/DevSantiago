import { Router, Request, Response } from "express";
import axios from "axios";
import { authenticate, authorize } from "../../middleware/auth";
import { aiRateLimiter } from "../../middleware/rateLimiter";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { ForbiddenError } from "../../middleware/errorHandler";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const router = Router();
router.use(authenticate);
router.use(authorize("CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"));

// GET /ai/status — verifica se o assistente está habilitado
router.get("/status", (_req: Request, res: Response) => {
  res.json({ success: true, data: { enabled: !!env.OPENAI_API_KEY } });
});

// P2 — schema com limites no array de mensagens
const aiChatSchema = z.object({
  condominiumId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

// POST /ai/chat — envia mensagem ao assistente
// aiRateLimiter limita 10/min por usuário — chamadas externas a
// OpenAI custam $$ e podem ser abusadas por usuário autenticado.
router.post("/chat", aiRateLimiter, async (req: Request, res: Response) => {
  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      message:
        "Assistente IA não configurado. Defina a variável OPENAI_API_KEY no ambiente.",
    });
  }

  const { condominiumId, messages } = aiChatSchema.parse(req.body);

  // P1 — verifica membership do ator no condomínio informado
  if (req.user!.role !== "SUPER_ADMIN") {
    const membership = await prisma.condominiumUser.findFirst({
      where: { userId: req.user!.userId, condominiumId, isActive: true },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenError("Acesso negado a este condomínio");
    }
  }

  // ─── Coleta contexto do condomínio ────────────────────────
  const today = new Date();
  const monthStr = format(today, "yyyy-MM");
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    condo,
    chargeSummary,
    openOrders,
    urgentOrders,
    openTickets,
    upcomingMaintenance,
  ] = await Promise.all([
    prisma.condominium.findUnique({
      where: { id: condominiumId },
      select: { name: true },
    }),
    prisma.charge.groupBy({
      by: ["status"],
      where: { unit: { condominiumId }, referenceMonth: monthStr },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.serviceOrder.count({
      where: { condominiumId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.serviceOrder.count({
      where: {
        condominiumId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        priority: "URGENT",
      },
    }),
    prisma.ticket.count({
      where: { condominiumId, status: "OPEN" },
    }),
    prisma.maintenanceSchedule.findMany({
      where: {
        condominiumId,
        isActive: true,
        nextDueDate: { lte: sevenDaysFromNow },
      },
      select: { title: true, nextDueDate: true },
      take: 5,
    }),
  ]);

  const pendingAmount =
    chargeSummary.find((s) => s.status === "PENDING")?._sum?.amount ?? 0;
  const overdueAmount =
    chargeSummary.find((s) => s.status === "OVERDUE")?._sum?.amount ?? 0;
  const paidAmount =
    chargeSummary.find((s) => s.status === "PAID")?._sum?.amount ?? 0;

  const maintenanceList =
    upcomingMaintenance
      .map(
        (m) =>
          `• ${m.title} — vence em ${format(m.nextDueDate, "dd/MM/yyyy", { locale: ptBR })} (${m.nextDueDate < today ? "VENCIDA" : "a vencer"})`,
      )
      .join("\n") || "Nenhuma manutenção urgente nos próximos 7 dias.";

  const systemPrompt = `Você é o Assistente IA do CondoSync, uma plataforma de gestão de condomínios. Você auxilia síndicos e administradores a tomar decisões, rascunhar comunicados e interpretar dados operacionais. Seja objetivo, profissional e use português do Brasil.

**Condomínio:** ${condo?.name ?? condominiumId}
**Data de hoje:** ${format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}

--- CONTEXTO ATUAL DO CONDOMÍNIO ---

**Financeiro (${monthStr}):**
- Cobranças pagas: R$ ${Number(paidAmount).toFixed(2)}
- Cobranças pendentes: R$ ${Number(pendingAmount).toFixed(2)}
- Cobranças em atraso: R$ ${Number(overdueAmount).toFixed(2)}

**Manutenção:**
- Ordens de serviço em aberto: ${openOrders} (${urgentOrders} urgente${urgentOrders !== 1 ? "s" : ""})

**Chamados de moradores:**
- Chamados abertos: ${openTickets}

**Manutenções preventivas próximas:**
${maintenanceList}

--- FIM DO CONTEXTO ---

Use esses dados quando o usuário perguntar sobre a situação do condomínio. Para rascunhar comunicados, use linguagem formal e cordial. Se não souber algo que não está no contexto, diga que não tem acesso a essa informação no momento.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: env.OPENAI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    const reply = response.data.choices?.[0]?.message?.content ?? "";
    return res.json({ success: true, data: { reply } });
  } catch (error: any) {
    logger.error(
      "Erro na chamada OpenAI:",
      error.response?.data || error.message,
    );
    const status = error.response?.status;
    if (status === 401) {
      return res
        .status(502)
        .json({ success: false, message: "Chave da API OpenAI inválida." });
    }
    if (status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "Limite de requisições da OpenAI atingido. Tente novamente em instantes.",
      });
    }
    return res.status(502).json({
      success: false,
      message: "Erro ao consultar a IA. Tente novamente.",
    });
  }
});

// ─── Q3.6: IA de cobrança / negociação ──────────────────────────
async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens = 600) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ausente");
  }
  const r = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4, // mais determinístico pra cobrança
    },
    {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      timeout: 30000,
    },
  );
  return r.data.choices?.[0]?.message?.content ?? "";
}

async function ensureChargeAccess(
  chargeId: string,
  actorUserId: string,
  actorRole: string,
) {
  const charge = await prisma.charge.findUnique({
    where: { id: chargeId },
    include: {
      unit: {
        include: {
          condominium: { select: { id: true, name: true } },
          residents: {
            where: { isActive: true, role: "RESIDENT" },
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      },
    },
  });
  if (!charge) throw new ForbiddenError("Cobrança não encontrada");
  const condoId = charge.unit?.condominiumId;
  if (!condoId) throw new ForbiddenError("Cobrança sem condomínio");
  if (actorRole !== "SUPER_ADMIN") {
    const m = await prisma.condominiumUser.findFirst({
      where: { userId: actorUserId, condominiumId: condoId, isActive: true },
      select: { id: true },
    });
    if (!m) throw new ForbiddenError("Acesso negado a este condomínio");
  }
  return charge;
}

const chargeSuggestionSchema = z.object({
  chargeId: z.string().uuid(),
  context: z.string().max(500).optional(), // contexto adicional do admin
});

// POST /ai/charge-suggestion — sugere estratégia de negociação
router.post(
  "/charge-suggestion",
  aiRateLimiter,
  async (req: Request, res: Response) => {
    const { chargeId, context } = chargeSuggestionSchema.parse(req.body);
    const charge = await ensureChargeAccess(
      chargeId,
      req.user!.userId,
      req.user!.role,
    );

    if (!env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "OPENAI_API_KEY não configurado",
      });
    }

    // Histórico do morador: outras cobranças vencidas/pagas dos últimos 12 meses
    const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000);
    const history = await prisma.charge.findMany({
      where: { unitId: charge.unitId, dueDate: { gte: yearAgo } },
      select: { status: true, amount: true, dueDate: true, paidAt: true },
      orderBy: { dueDate: "desc" },
      take: 12,
    });
    const paidLast12 = history.filter((h) => h.status === "PAID").length;
    const overdueLast12 = history.filter(
      (h) => h.status === "PENDING" && h.dueDate < new Date(),
    ).length;
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - charge.dueDate.getTime()) / (24 * 3600 * 1000)),
    );

    const resident = charge.unit?.residents?.[0]?.user;
    const unitLabel = `${charge.unit?.block ? charge.unit.block + "/" : ""}${charge.unit?.identifier}`;

    const systemPrompt = `Você é um especialista em recuperação de crédito condominial brasileiro. Análise objetiva, sem moralismo. Responda em JSON estrito:
{
  "riskLevel": "low" | "medium" | "high",
  "rationale": "1-2 frases explicando o nível",
  "recommendedActions": [
    { "label": "...", "description": "...", "urgency": "now" | "this_week" | "this_month" }
  ],
  "negotiationOptions": [
    { "type": "discount" | "installments" | "extension" | "amnesty",
      "description": "...",
      "estimatedRecoveryRate": 0-100 }
  ],
  "messageDraft": "texto curto e cordial para enviar ao morador (até 280 chars, sem emojis excessivos)"
}`;

    const userPrompt = `Análise de cobrança:
- Condomínio: ${charge.unit?.condominium?.name}
- Unidade: ${unitLabel}
- Morador: ${resident?.name ?? "desconhecido"}
- Valor: R$ ${Number(charge.amount).toFixed(2)}
- Vencimento: ${charge.dueDate.toLocaleDateString("pt-BR")}
- Dias em atraso: ${daysOverdue}
- Status atual: ${charge.status}

Histórico do morador nos últimos 12 meses:
- Cobranças pagas: ${paidLast12}
- Outras em atraso (além desta): ${overdueLast12}

${context ? `Contexto do síndico: ${context}` : ""}

Devolva APENAS o JSON, sem texto antes ou depois.`;

    try {
      const raw = await callOpenAI(systemPrompt, userPrompt, 700);
      // Tenta extrair JSON mesmo se vier com cercas markdown
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
      res.json({ success: true, data: { suggestion: parsed, history: { paidLast12, overdueLast12, daysOverdue } } });
    } catch (err: any) {
      logger.error("Falha em /ai/charge-suggestion: " + (err.message || String(err)));
      res.status(502).json({
        success: false,
        message: "Erro ao gerar sugestão. Verifique OPENAI_API_KEY ou tente novamente.",
      });
    }
  },
);

const draftMessageSchema = z.object({
  chargeId: z.string().uuid(),
  tone: z.enum(["cordial", "firm", "urgent"]).default("cordial"),
  channel: z.enum(["email", "whatsapp", "sms"]).default("whatsapp"),
});

// POST /ai/draft-message — rascunha mensagem de cobrança
router.post(
  "/draft-message",
  aiRateLimiter,
  async (req: Request, res: Response) => {
    const { chargeId, tone, channel } = draftMessageSchema.parse(req.body);
    const charge = await ensureChargeAccess(
      chargeId,
      req.user!.userId,
      req.user!.role,
    );

    if (!env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "OPENAI_API_KEY não configurado",
      });
    }

    const resident = charge.unit?.residents?.[0]?.user;
    const unitLabel = `${charge.unit?.block ? charge.unit.block + "/" : ""}${charge.unit?.identifier}`;
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - charge.dueDate.getTime()) / (24 * 3600 * 1000)),
    );

    const toneInstr =
      tone === "firm"
        ? "Tom firme e direto, mas respeitoso. Mencionar consequências legais sem ameaçar."
        : tone === "urgent"
          ? "Tom urgente — risco de protesto/serviços. Cordial mas alarmante."
          : "Tom cordial e amigável, presumir boa-fé.";

    const channelInstr =
      channel === "whatsapp"
        ? "Mensagem de WhatsApp: máximo 4 linhas, emojis sutis OK (use sparingly), texto natural sem assinatura formal."
        : channel === "email"
          ? "E-mail: incluir saudação, corpo cordial, opções de pagamento, despedida e linha 'Atenciosamente, [Síndico]' como placeholder."
          : "SMS: máximo 160 caracteres, direto ao ponto.";

    const systemPrompt = `Você redige mensagens de cobrança para condomínios brasileiros. Sempre em português do Brasil. ${toneInstr} ${channelInstr} Use placeholders [NOME_CONDOMINIO], [LINK_PAGAMENTO] quando apropriado.`;

    const userPrompt = `Redija mensagem para:
- Morador: ${resident?.name ?? "[NOME_MORADOR]"}
- Unidade: ${unitLabel}
- Condomínio: ${charge.unit?.condominium?.name}
- Valor: R$ ${Number(charge.amount).toFixed(2)}
- Vencimento: ${charge.dueDate.toLocaleDateString("pt-BR")}
- Dias em atraso: ${daysOverdue}

Retorne apenas o texto da mensagem, sem comentários adicionais.`;

    try {
      const message = await callOpenAI(systemPrompt, userPrompt, 400);
      res.json({ success: true, data: { message, channel, tone } });
    } catch (err: any) {
      logger.error("Falha em /ai/draft-message: " + (err.message || String(err)));
      res.status(502).json({ success: false, message: "Erro ao gerar mensagem." });
    }
  },
);

export default router;
