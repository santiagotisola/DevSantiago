import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, ChevronLeft, Send, Clock, CheckCircle2,
  AlertCircle, Circle, Loader2, Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const CATEGORIES = ['manutencao', 'financeiro', 'barulho', 'seguranca', 'outro'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;

const CAT_LABEL: Record<string, string> = {
  manutencao: 'Manutenção', financeiro: 'Financeiro',
  barulho: 'Barulho', seguranca: 'Segurança', outro: 'Outro',
};
const PRIO_LABEL: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
const STATUS_LABEL: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', CLOSED: 'Fechado' };

const PRIO_COLOR: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-green-100 text-green-700',
};

interface TicketUser { id: string; name: string; avatarUrl?: string; role?: string }
interface Message { id: string; content: string; createdAt: string; sender: TicketUser }
interface Ticket {
  id: string; title: string; category: string; priority: string; status: string;
  createdAt: string; updatedAt: string;
  createdBy: TicketUser; assignedTo?: TicketUser;
  _count?: { messages: number };
  messages?: Message[];
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'OPEN') return <Circle className="w-4 h-4 text-blue-500" />;
  if (status === 'IN_PROGRESS') return <Clock className="w-4 h-4 text-orange-500" />;
  return <CheckCircle2 className="w-4 h-4 text-green-500" />;
}

export default function TicketsPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const condominiumId = selectedCondominiumId;
  const qc = useQueryClient();

  const isStaff = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'DOORMAN', 'SUPER_ADMIN'].includes(user?.role ?? '');
  const isMgmt = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', category: 'outro' as string, priority: 'LOW' as string, message: '' });
  const [reply, setReply] = useState('');

  // ─── Queries ──────────────────────────────────────────────────
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ['tickets', condominiumId, statusFilter, catFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (catFilter) p.set('category', catFilter);
      const res = await api.get(`/tickets/${condominiumId}?${p}`);
      return res.data.data.tickets;
    },
    enabled: !!condominiumId,
  });

  const { data: detail } = useQuery<Ticket>({
    queryKey: ['ticket-detail', selectedId],
    queryFn: async () => {
      const res = await api.get(`/tickets/detail/${selectedId}`);
      return res.data.data.ticket;
    },
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  // ─── Mutations ────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (body: object) => api.post('/tickets', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setShowNew(false);
      setNewForm({ title: '', category: 'outro', priority: 'LOW', message: '' });
      setSelectedId(res.data.data.ticket.id);
    },
  });

  const replyMut = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/tickets/${id}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setReply('');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/tickets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-detail', selectedId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setSelectedId(null);
    },
  });

  const handleCreate = () => {
    if (!condominiumId || !newForm.title || !newForm.message) return;
    createMut.mutate({ ...newForm, condominiumId });
  };

  // ─── Thread view ─────────────────────────────────────────────
  if (selectedId) {
    const t = detail;
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto p-4 gap-4">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-fit">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        {!t ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{t.title}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIO_COLOR[t.priority]}`}>{PRIO_LABEL[t.priority]}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{CAT_LABEL[t.category]}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Aberto por <strong>{t.createdBy.name}</strong> · {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    {t.assignedTo && <> · Responsável: <strong>{t.assignedTo.name}</strong></>}
                  </p>
                </div>
                {isStaff && (
                  <div className="flex gap-2">
                    <select
                      value={t.status}
                      onChange={(e) => updateMut.mutate({ id: t.id, data: { status: e.target.value } })}
                      className="text-xs border rounded-lg px-2 py-1.5"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    {isMgmt && (
                      <button onClick={() => { if (confirm('Excluir ticket?')) deleteMut.mutate(t.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 border rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(t.messages ?? []).map((m) => {
                const isMe = m.sender.id === user?.id;
                const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'DOORMAN', 'SUPER_ADMIN'].includes(m.sender.role ?? '');
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 overflow-hidden">
                      {m.sender.avatarUrl
                        ? <img src={m.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : m.sender.name[0].toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <div className={`flex items-center gap-2 text-xs text-gray-400 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="font-medium text-gray-600">{m.sender.name}</span>
                        {isAdmin && <span className="text-blue-600 font-medium">Administração</span>}
                        <span>{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            {t.status !== 'CLOSED' ? (
              <div className="flex gap-2 bg-white border rounded-xl p-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (reply.trim()) replyMut.mutate({ id: t.id, content: reply.trim() }); } }}
                  placeholder="Digite sua mensagem... (Enter para enviar)"
                  rows={2}
                  className="flex-1 resize-none text-sm outline-none p-2"
                />
                <button
                  onClick={() => { if (reply.trim()) replyMut.mutate({ id: t.id, content: reply.trim() }); }}
                  disabled={replyMut.isPending || !reply.trim()}
                  className="self-end p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {replyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400 py-3 bg-gray-50 rounded-xl border">
                Ticket fechado — não é possível enviar novas mensagens
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chamados</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isStaff ? 'Gerencie as solicitações dos moradores' : 'Envie solicitações para a administração'}
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo Chamado
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[['', 'Todos'], ...STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
        <div className="h-6 w-px bg-gray-200 self-center" />
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catFilter === c ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
            {CAT_LABEL[c]}
          </button>
        ))}
      </div>

      {/* Modal: criar chamado */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Novo Chamado</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input value={newForm.title} onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Descreva o problema brevemente" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={newForm.category} onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prioridade</label>
                  <select value={newForm.priority} onChange={(e) => setNewForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição *</label>
                <textarea value={newForm.message} onChange={(e) => setNewForm((f) => ({ ...f, message: e.target.value }))}
                  rows={4} placeholder="Descreva sua solicitação com detalhes..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate}
                disabled={createMut.isPending || !newForm.title || !newForm.message}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending ? 'Enviando...' : 'Criar Chamado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum chamado encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className="w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm hover:border-blue-200 transition-all flex items-start gap-4">
              <div className="mt-0.5"><StatusIcon status={t.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm truncate">{t.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIO_COLOR[t.priority]}`}>{PRIO_LABEL[t.priority]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{CAT_LABEL[t.category]}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {isStaff && <span>Por: <strong className="text-gray-600">{t.createdBy.name}</strong></span>}
                  <span>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                  {(t._count?.messages ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{t._count?.messages}</span>
                  )}
                  {t.assignedTo && <span>→ {t.assignedTo.name}</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
