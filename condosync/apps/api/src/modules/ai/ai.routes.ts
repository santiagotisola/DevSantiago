import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../../middleware/auth';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const router = Router();
router.use(authenticate);
router.use(authorize('CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'));

// GET /ai/status — verifica se o assistente está habilitado
router.get('/status', (_req: Request, res: Response) => {
  res.json({ success: true, data: { enabled: !!env.OPENAI_API_KEY } });
});

// POST /ai/chat — envia mensagem ao assistente
router.post('/chat', async (req: Request, res: Response) => {
  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      message: 'Assistente IA não configurado. Defina a variável OPENAI_API_KEY no ambiente.',
    });
  }

  const { condominiumId, messages } = req.body as {
    condominiumId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!condominiumId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'condominiumId e messages são obrigatórios' });
  }

  // ─── Coleta contexto do condomínio ────────────────────────
  const today = new Date();
  const monthStr = format(today, 'yyyy-MM');
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    condo,
    chargeSummary,
    openOrders,
    urgentOrders,
    openTickets,
    upcomingMaintenance,
  ] = await Promise.all([
    prisma.condominium.findUnique({ where: { id: condominiumId }, select: { name: true } }),
    prisma.charge.groupBy({
      by: ['status'],
      where: { unit: { condominiumId }, referenceMonth: monthStr },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.serviceOrder.count({
      where: { condominiumId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.serviceOrder.count({
      where: { condominiumId, status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: 'URGENT' },
    }),
    prisma.ticket.count({
      where: { condominiumId, status: 'OPEN' },
    }),
    prisma.maintenanceSchedule.findMany({
      where: {
        condominiumId,
        isActive: true,
        nextDueDate: { lte: sevenDaysFromNow },
      },
      select: { name: true, nextDueDate: true, status: true },
      take: 5,
    }),
  ]);

  const pendingAmount = chargeSummary.find((s) => s.status === 'PENDING')?._sum?.amount ?? 0;
  const overdueAmount = chargeSummary.find((s) => s.status === 'OVERDUE')?._sum?.amount ?? 0;
  const paidAmount = chargeSummary.find((s) => s.status === 'PAID')?._sum?.amount ?? 0;

  const maintenanceList = upcomingMaintenance
    .map((m) => `• ${m.name} — vence em ${format(m.nextDueDate, "dd/MM/yyyy", { locale: ptBR })} (${m.status === 'OVERDUE' ? 'VENCIDA' : 'a vencer'})`)
    .join('\n') || 'Nenhuma manutenção urgente nos próximos 7 dias.';

  const systemPrompt = `Você é o Assistente IA do CondoSync, uma plataforma de gestão de condomínios. Você auxilia síndicos e administradores a tomar decisões, rascunhar comunicados e interpretar dados operacionais. Seja objetivo, profissional e use português do Brasil.

**Condomínio:** ${condo?.name ?? condominiumId}
**Data de hoje:** ${format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}

--- CONTEXTO ATUAL DO CONDOMÍNIO ---

**Financeiro (${monthStr}):**
- Cobranças pagas: R$ ${Number(paidAmount).toFixed(2)}
- Cobranças pendentes: R$ ${Number(pendingAmount).toFixed(2)}
- Cobranças em atraso: R$ ${Number(overdueAmount).toFixed(2)}

**Manutenção:**
- Ordens de serviço em aberto: ${openOrders} (${urgentOrders} urgente${urgentOrders !== 1 ? 's' : ''})

**Chamados de moradores:**
- Chamados abertos: ${openTickets}

**Manutenções preventivas próximas:**
${maintenanceList}

--- FIM DO CONTEXTO ---

Use esses dados quando o usuário perguntar sobre a situação do condomínio. Para rascunhar comunicados, use linguagem formal e cordial. Se não souber algo que não está no contexto, diga que não tem acesso a essa informação no momento.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const reply = response.data.choices?.[0]?.message?.content ?? '';
    return res.json({ success: true, data: { reply } });
  } catch (error: any) {
    logger.error('Erro na chamada OpenAI:', error.response?.data || error.message);
    const status = error.response?.status;
    if (status === 401) {
      return res.status(502).json({ success: false, message: 'Chave da API OpenAI inválida.' });
    }
    if (status === 429) {
      return res.status(429).json({ success: false, message: 'Limite de requisições da OpenAI atingido. Tente novamente em instantes.' });
    }
    return res.status(502).json({ success: false, message: 'Erro ao consultar a IA. Tente novamente.' });
  }
});

export default router;
