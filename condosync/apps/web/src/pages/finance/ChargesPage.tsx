import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  Receipt, Plus, Search, Loader2, CheckCircle, Shuffle, X,
  CalendarDays, Layers, ChevronDown, ChevronUp, Pencil, Eye,
  Filter, TrendingUp, AlertTriangle, MoreHorizontal, Trash2,
  DollarSign, FileText, Download, Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Status ───────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: 'Pendente', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  PAID: { label: 'Pago', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  OVERDUE: { label: 'Em Atraso', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
  CANCELED: { label: 'Cancelada', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
};

// ─── StatCard Premium ──────────────────────────────────────────────────
function StatCard({ title, value, color, icon: Icon, subtitle }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 min-w-0 h-full">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shrink-0`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{title}</p>
        <p className="text-2xl font-black text-gray-800 tracking-tight truncate" title={value}>{value}</p>
        {subtitle && <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}
function toISODateTime(iso: string) { return `${iso}T00:00:00.000Z`; }

// â”€â”€â”€ Modal genÃ©rico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-[32px] w-full max-w-xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;
}

export function ChargesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const [tab, setTab] = useState<'charges' | 'installments'>('charges');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showRatio, setShowRatio] = useState(false);
  const [showRatioInstall, setShowRatioInstall] = useState(false);
  const [showChargeInstall, setShowChargeInstall] = useState(false);
  const [showPay, setShowPay] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState<any | null>(null);

  const [createForm, setCreateForm] = useState({ description: '', amount: '', dueDate: todayISO(), unitId: '', accountId: '' });
  const [editForm, setEditForm] = useState({ description: '', amount: '', dueDate: '', unitId: '' });
  const [payAmount, setPayAmount] = useState('');

  // ─── Queries ────────────────────────────────────────────────────────
  const { data: chargesData, isLoading } = useQuery({
    queryKey: ['charges', selectedCondominiumId, statusFilter, monthFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.referenceMonth = monthFilter;
      const res = await api.get(`/finance/charges/${selectedCondominiumId}`, { params });
      return res.data.data.charges as any[];
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/finance/accounts/${selectedCondominiumId}`);
      return res.data.data.accounts as any[];
    },
    enabled: !!selectedCondominiumId && isAdmin,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as any[];
    },
    enabled: !!selectedCondominiumId && isAdmin,
  });

  // ─── Computed Metrics ────────────────────────────────────────────────
  const metrics = useMemo(() => {
    // Usamos chargesData original sem filtro de status para as métricas totais
    if (!chargesData) return { total: 0, pending: 0, overdue: 0, paid: 0 };
    return chargesData.reduce((acc, c) => {
      const val = c.amount || 0;
      acc.total += val;
      if (c.status === 'PENDING') acc.pending += val;
      if (c.status === 'OVERDUE') acc.overdue += val;
      if (c.status === 'PAID') acc.paid += val;
      return acc;
    }, { total: 0, pending: 0, overdue: 0, paid: 0 });
  }, [chargesData]);

  // ─── Filtered Data ──────────────────────────────────────────────────
  const filteredCharges = useMemo(() => {
    if (!chargesData) return [];
    return chargesData.filter((c: any) => {
      const matchesSearch = !search ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.unit?.identifier?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [chargesData, search, statusFilter]);

  // ─── Mutations ──────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/finance/charges', {
      ...d, amount: parseFloat(d.amount), condominiumId: selectedCondominiumId, dueDate: toISODateTime(d.dueDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowCreate(false); },
  });

  const payMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/finance/charges/${id}/pay`, { paidAmount: amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowPay(null); },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/charges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  });

  const charges = (chargesData || []).filter((c: any) =>
    !search || c.description?.toLowerCase().includes(search.toLowerCase()) || c.unit?.identifier?.includes(search)
  );

  return (
    <div className="space-y-6">

      {/* CabeÃ§alho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CobranÃ§as</h1>
          <p className="text-muted-foreground">Boletos, taxas condominiais e parcelamentos</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowRatio(true)} className="px-5 py-3 border border-gray-100 bg-white hover:bg-gray-50 text-gray-600 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
              <Shuffle className="w-4 h-4" /> Rateio Rápido
            </button>
            <button onClick={() => setShowRatioInstall(true)}
              className="flex items-center gap-2 border border-blue-300 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50">
              <CalendarDays className="w-4 h-4" /> Rateio Parcelado
            </button>
            <button onClick={() => setShowRatio(true)}
              className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Shuffle className="w-4 h-4" /> Rateio
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Nova CobranÃ§a
            </button>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab('charges')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'charges' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Receipt className="w-4 h-4" /> CobranÃ§as
        </button>
        <button onClick={() => setTab('installments')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'installments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <CalendarDays className="w-4 h-4" /> Parcelamentos
          {installGroups.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">{installGroups.length}</span>
          )}
        </button>
      </div>

      {/* â”€â”€ Tab: CobranÃ§as â”€â”€ */}
      {tab === 'charges' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descriÃ§Ã£o ou unidade..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <input
              type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : charges.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Receipt className="w-10 h-10" /><p>Nenhuma cobranÃ§a encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">DescriÃ§Ã£o</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ref.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">AÃ§Ãµes</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {charges.map((c: any) => {
                  const st = STATUS[c.status] || STATUS.PENDING;
                  const isInstall = /\(\d+\/\d+\)$/.test(c.description || '');
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          {c.description}
                          {isInstall && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Parcela</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.unit?.identifier || 'â€”'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(c.amount)}</td>
                      <td className={`px-4 py-3 ${c.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {formatDate(c.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.referenceMonth || 'â€”'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'PENDING' && (
                              <button onClick={() => { setShowPay(c); setPayAmount(String(c.amount)); }}
                                className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                <CheckCircle className="w-3 h-3" /> Pagar
                              </button>
                            )}
                            {c.status === 'PENDING' && (
                              <button onClick={() => { setShowEdit(c); setEditForm({ description: c.description, amount: String(c.amount), dueDate: c.dueDate?.slice(0, 10) || '', unitId: c.unitId || '' }); }}
                                className="px-2 py-1 border rounded text-xs hover:bg-gray-50 flex items-center gap-1">
                                <Pencil className="w-3 h-3" /> Editar
                              </button>
                            )}
                            {c.status === 'PENDING' && (
                              <button onClick={() => window.confirm('Cancelar esta cobranÃ§a?') && cancelMut.mutate(c.id)}
                                className="px-2 py-1 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

{/* â”€â”€ Tab: Parcelamentos â”€â”€ */ }
{
  tab === 'installments' && (
    <div className="space-y-3">
      {installGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <CalendarDays className="w-10 h-10" />
          <p>Nenhum parcelamento encontrado</p>
          {isAdmin && <p className="text-xs">Use "Rateio Parcelado" ou "Parcelas / Unidade" para criar.</p>}
        </div>
      ) : installGroups.map(group => {
        const pct = Math.round((group.paid / group.total) * 100);
        const isOpen = expandedGroup === group.key;
        return (
          <div key={group.key} className="bg-white rounded-xl border overflow-hidden">
            <button
              onClick={() => setExpandedGroup(isOpen ? null : group.key)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="font-semibold">{group.baseDesc}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {group.paid}/{group.total} parcelas pagas Â· Total: {formatCurrency(group.totalAmount)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{pct}%</span><span>{group.paid}/{group.total}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-5 py-2 font-medium text-gray-600">Parcela</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Unidade</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Valor</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Vencimento</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                      {isAdmin && <th className="text-right px-4 py-2 font-medium text-gray-600">AÃ§Ãµes</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.items.map((c: any) => {
                      const st = STATUS[c.status] || STATUS.PENDING;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium">{c.installNum}/{c.installTotal}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{c.unit?.identifier || 'â€”'}</td>
                          <td className="px-4 py-2.5 font-semibold">{formatCurrency(c.amount)}</td>
                          <td className={`px-4 py-2.5 ${c.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {formatDate(c.dueDate)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                {c.status === 'PENDING' && (
                                  <button onClick={() => { setShowPay(c); setPayAmount(String(c.amount)); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                    <CheckCircle className="w-3 h-3" /> Pagar
                                  </button>
                                )}
                                {c.status === 'PENDING' && (
                                  <button onClick={() => window.confirm('Cancelar?') && cancelMut.mutate(c.id)}
                                    className="px-2 py-1 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
      </div >

    {/* â•â• Modal: Nova CobranÃ§a â•â• */ }
  {
    showCreate && (
      <Modal title="Nova CobranÃ§a" onClose={() => setShowCreate(false)}>
        <div className="space-y-3">
          <InputField label="DescriÃ§Ã£o *" value={createForm.description} onChange={v => setCreateForm({ ...createForm, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Valor (R$) *" type="number" value={createForm.amount} onChange={v => setCreateForm({ ...createForm, amount: v })} />
            <InputField label="Vencimento *" type="date" value={createForm.dueDate} onChange={v => setCreateForm({ ...createForm, dueDate: v })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unidade *</label>
            <select value={createForm.unitId} onChange={e => setCreateForm({ ...createForm, unitId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` / Bloco ${u.block}` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Conta Financeira *</label>
            <select value={createForm.accountId} onChange={e => setCreateForm({ ...createForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button onClick={() => createMut.mutate(createForm)}
            disabled={createMut.isPending || !createForm.description || !createForm.amount || !createForm.unitId || !createForm.accountId}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Criar'}
          </button>
        </div>
      </Modal>
    )
  }

  {/* â•â• Modal: Rateio Simples â•â• */ }
  {
    showRatio && (
      <Modal title="Rateio de CobranÃ§a" onClose={() => { setShowRatio(false); setRatioPreview(null); }}>
        <p className="text-sm text-muted-foreground">O valor total serÃ¡ dividido entre <strong>todas as unidades</strong>.</p>
        <div className="space-y-3">
          <InputField label="DescriÃ§Ã£o *" value={ratioForm.description} onChange={v => setRatioForm({ ...ratioForm, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Valor Total (R$) *" type="number" value={ratioForm.totalAmount} onChange={v => setRatioForm({ ...ratioForm, totalAmount: v })} />
            <InputField label="Vencimento *" type="date" value={ratioForm.dueDate} onChange={v => setRatioForm({ ...ratioForm, dueDate: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">MÃ©todo de DivisÃ£o</label>
              <select value={ratioForm.method} onChange={e => setRatioForm({ ...ratioForm, method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="equal">IgualitÃ¡rio</option>
                <option value="fraction">Por fraÃ§Ã£o ideal</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Conta Financeira *</label>
              <select value={ratioForm.accountId || firstAccountId} onChange={e => setRatioForm({ ...ratioForm, accountId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => setRatioPreview(buildRatioPreview())}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <Eye className="w-4 h-4" /> Visualizar divisÃ£o por unidade
          </button>
          {ratioPreview && (
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="text-left px-3 py-2">Unidade</th><th className="text-right px-3 py-2">Valor</th></tr></thead>
                <tbody className="divide-y">
                  {ratioPreview.map((r, i) => (
                    <tr key={i}><td className="px-3 py-1.5">{r.block ? `${r.block} - ` : ''}{r.identifier}</td><td className="px-3 py-1.5 text-right font-medium">{formatCurrency(r.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowRatio(false); setRatioPreview(null); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button onClick={() => ratioMut.mutate(ratioForm)}
            disabled={ratioMut.isPending || !ratioForm.description || !ratioForm.totalAmount || !ratioForm.accountId}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {ratioMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ratear'}
          </button>
        </div>
      </Modal>
    )
  }

  {/* â•â• Modal: Rateio Parcelado â•â• */ }
  {
    showRatioInstall && (
      <Modal title="Rateio Parcelado" onClose={() => { setShowRatioInstall(false); setInstallPreview(null); }}>
        <p className="text-sm text-muted-foreground">Cria <strong>N parcelas</strong> de rateio para todas as unidades, com datas espaÃ§adas.</p>
        <div className="space-y-3">
          <InputField label="DescriÃ§Ã£o base *" value={installForm.description}
            onChange={v => setInstallForm({ ...installForm, description: v })} placeholder="Ex: Taxa Extra ManutenÃ§Ã£o" />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Valor total por parcela (R$) *" type="number" value={installForm.totalAmount}
              onChange={v => setInstallForm({ ...installForm, totalAmount: v })} />
            <InputField label="1Âª Parcela â€” Vencimento *" type="date" value={installForm.firstDueDate}
              onChange={v => setInstallForm({ ...installForm, firstDueDate: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">NÂº de Parcelas *</label>
              <input type="number" min={2} max={60} value={installForm.installments}
                onChange={e => setInstallForm({ ...installForm, installments: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Intervalo (dias)</label>
              <input type="number" min={7} max={90} value={installForm.intervalDays}
                onChange={e => setInstallForm({ ...installForm, intervalDays: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">DivisÃ£o</label>
              <select value={installForm.method} onChange={e => setInstallForm({ ...installForm, method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="equal">IgualitÃ¡rio</option>
                <option value="fraction">Por fraÃ§Ã£o</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Conta Financeira *</label>
            <select value={installForm.accountId || firstAccountId}
              onChange={e => setInstallForm({ ...installForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={() => setInstallPreview(buildInstallPreview(installForm.description, installForm.firstDueDate, installForm.installments, installForm.intervalDays))}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <Eye className="w-4 h-4" /> Visualizar agendamento
          </button>
          {installPreview && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">CalendÃ¡rio de vencimentos</div>
              <div className="divide-y max-h-40 overflow-y-auto">
                {installPreview.map(p => (
                  <div key={p.installment} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-16 text-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{p.installment}/{p.n}</span>
                    <span className="flex-1 text-sm">{p.description}</span>
                    <span className="text-sm text-gray-500">{formatDate(p.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowRatioInstall(false); setInstallPreview(null); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button onClick={() => ratioInstallMut.mutate(installForm)}
            disabled={ratioInstallMut.isPending || !installForm.description || !installForm.totalAmount || !installForm.accountId}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {ratioInstallMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Criar ${installForm.installments || ''} Parcelas`}
          </button>
        </div>
      </Modal>
    )
  }

  {/* â•â• Modal: Parcelas por Unidade â•â• */ }
  {
    showChargeInstall && (
      <Modal title="Parcelas por Unidade" onClose={() => setShowChargeInstall(false)}>
        <p className="text-sm text-muted-foreground">Gera cobranÃ§as parceladas para uma unidade especÃ­fica.</p>
        <div className="space-y-3">
          <InputField label="DescriÃ§Ã£o base *" value={chargeInstallForm.description}
            onChange={v => setChargeInstallForm({ ...chargeInstallForm, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Valor por Parcela (R$) *" type="number" value={chargeInstallForm.amount}
              onChange={v => setChargeInstallForm({ ...chargeInstallForm, amount: v })} />
            <InputField label="1Âº Vencimento *" type="date" value={chargeInstallForm.firstDueDate}
              onChange={v => setChargeInstallForm({ ...chargeInstallForm, firstDueDate: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">NÂº de Parcelas *</label>
              <input type="number" min={2} max={60} value={chargeInstallForm.installments}
                onChange={e => setChargeInstallForm({ ...chargeInstallForm, installments: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Intervalo (dias)</label>
              <input type="number" min={7} max={90} value={chargeInstallForm.intervalDays}
                onChange={e => setChargeInstallForm({ ...chargeInstallForm, intervalDays: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Unidade *</label>
            <select value={chargeInstallForm.unitId} onChange={e => setChargeInstallForm({ ...chargeInstallForm, unitId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` / Bloco ${u.block}` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Conta Financeira *</label>
            <select value={chargeInstallForm.accountId || firstAccountId}
              onChange={e => setChargeInstallForm({ ...chargeInstallForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {chargeInstallForm.description && chargeInstallForm.firstDueDate && parseInt(chargeInstallForm.installments) >= 2 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">PrÃ©via do agendamento</div>
              <div className="divide-y max-h-40 overflow-y-auto">
                {buildInstallPreview(chargeInstallForm.description, chargeInstallForm.firstDueDate, chargeInstallForm.installments, chargeInstallForm.intervalDays).map(p => (
                  <div key={p.installment} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-16 text-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">{p.installment}/{p.n}</span>
                    <span className="flex-1 text-sm">{p.description}</span>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{formatDate(p.dueDate)}</div>
                      {chargeInstallForm.amount && <div className="text-xs font-medium">{formatCurrency(parseFloat(chargeInstallForm.amount))}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setShowChargeInstall(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button onClick={() => chargeInstallMut.mutate(chargeInstallForm)}
            disabled={chargeInstallMut.isPending || !chargeInstallForm.description || !chargeInstallForm.amount || !chargeInstallForm.unitId || !chargeInstallForm.accountId}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {chargeInstallMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Criar ${chargeInstallForm.installments || ''} Parcelas`}
          </button>
        </div>
      </Modal>
    )
  }

  {/* â•â• Modal: Confirmar Pagamento â•â• */ }
  {
    showPay && (
      <Modal title="Confirmar Pagamento" onClose={() => setShowPay(null)}>
        <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
          <div><span className="text-gray-500">DescriÃ§Ã£o:</span> <span className="font-medium">{showPay.description}</span></div>
          <div><span className="text-gray-500">Unidade:</span> <span>{showPay.unit?.identifier || 'â€”'}</span></div>
          <div><span className="text-gray-500">Vencimento:</span> <span>{formatDate(showPay.dueDate)}</span></div>
        </div>
        <InputField label="Valor pago (R$) *" type="number" value={payAmount} onChange={setPayAmount} />
        <div className="flex gap-3">
          <button onClick={() => setShowPay(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
          <button onClick={() => payMut.mutate({ id: showPay.id, amount: parseFloat(payAmount) })}
            disabled={payMut.isPending || !payAmount}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {payMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Pagamento'}
          </button>
        </div>
      </Modal>
    )
  }

  {/* â•â• Modal: Editar CobranÃ§a â•â• */ }
  {
    showEdit && (
      <Modal title="Editar CobranÃ§a" onClose={() => setShowEdit(null)}>
        <div className="space-y-3">
          <InputField label="DescriÃ§Ã£o *" value={editForm.description} onChange={v => setEditForm({ ...editForm, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Valor (R$) *" type="number" value={editForm.amount} onChange={v => setEditForm({ ...editForm, amount: v })} />
            <InputField label="Vencimento *" type="date" value={editForm.dueDate} onChange={v => setEditForm({ ...editForm, dueDate: v })} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Confirmar Valor Pago (R$)</label>
            <input
              autoFocus type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-4 pt-8">
            <button onClick={() => setShowPay(null)} className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
            <button
              onClick={() => payMut.mutate({ id: showPay.id, amount: parseFloat(payAmount) })}
              disabled={payMut.isPending}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
            >
              {payMut.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Recebimento'}
            </button>
          </div>
      </Modal>
    )
  }
      </AnimatePresence >
    </div >
  );
}
