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
  PENDING:  { label: 'Pendente',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  PAID:     { label: 'Pago',       bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  OVERDUE:  { label: 'Em Atraso',  bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
  CANCELED: { label: 'Cancelada',  bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-300' },
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

// ─── Modal Premium ──────────────────────────────────────────────────
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
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter]   = useState('');

  const [showCreate, setShowCreate]               = useState(false);
  const [showRatio, setShowRatio]                 = useState(false);
  const [showRatioInstall, setShowRatioInstall]   = useState(false);
  const [showChargeInstall, setShowChargeInstall] = useState(false);
  const [showPay, setShowPay]                     = useState<any | null>(null);
  const [showEdit, setShowEdit]                   = useState<any | null>(null);
  
  const [createForm, setCreateForm]           = useState({ description: '', amount: '', dueDate: todayISO(), unitId: '', accountId: '' });
  const [editForm, setEditForm]               = useState({ description: '', amount: '', dueDate: '', unitId: '' });
  const [payAmount, setPayAmount]             = useState('');

  // ─── Queries ────────────────────────────────────────────────────────
  const { data: chargesData, isLoading } = useQuery({
    queryKey: ['charges', selectedCondominiumId, statusFilter, monthFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (monthFilter)  params.referenceMonth = monthFilter;
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
    <div className="space-y-8 pb-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Cobranças & Receitas</h1>
          <p className="text-gray-500 font-medium mt-1">Gestão de boletos, rateios e histórico de pagamentos</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
             <button onClick={() => setShowRatio(true)} className="px-5 py-3 border border-gray-100 bg-white hover:bg-gray-50 text-gray-600 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
              <Shuffle className="w-4 h-4" /> Rateio Rápido
            </button>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
              <Plus className="w-5 h-5" /> Nova Cobrança
            </button>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Previsto" value={formatCurrency(metrics.total)} color="bg-blue-500" icon={Receipt} subtitle="Valor bruto em aberto/pago" />
        <StatCard title="Total Pago" value={formatCurrency(metrics.paid)} color="bg-emerald-500" icon={CheckCircle} subtitle={`${((metrics.paid/metrics.total || 0)*100).toFixed(0)}% da meta atingida`} />
        <StatCard title="Em Aberto" value={formatCurrency(metrics.pending)} color="bg-amber-500" icon={CalendarDays} subtitle="Aguardando vencimento" />
        <StatCard title="Em Atraso" value={formatCurrency(metrics.overdue)} color="bg-rose-500" icon={AlertTriangle} subtitle="Ações de cobrança necessárias" />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            {[
              { id: '', label: 'Tudo', color: 'bg-gray-100 text-gray-600' },
              { id: 'PENDING', label: 'Pendentes', color: 'bg-amber-50 text-amber-600' },
              { id: 'PAID', label: 'Pagos', color: 'bg-emerald-50 text-emerald-600' },
              { id: 'OVERDUE', label: 'Atrasados', color: 'bg-rose-50 text-rose-600' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === f.id ? `${f.color} border-current shadow-sm scale-105` : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Unidade ou descrição..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-600"
              />
            </div>
            <input 
              type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredCharges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6">
                <Receipt className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-700">Nenhum registro encontrado</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">Ajuste os filtros ou crie uma nova cobrança para o período selecionado.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição & Unidade</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</th>
                  <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  {isAdmin && <th className="text-right px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCharges.map((c: any) => {
                  const st = STATUS[c.status] || STATUS.PENDING;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-gray-400 border border-gray-100 group-hover:bg-white transition-all`}>
                            {c.unit?.identifier || '—'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 tracking-tight">{c.description}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ref: {c.referenceMonth || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-gray-800 tracking-tight">{formatCurrency(c.amount)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-sm font-bold ${c.status === 'OVERDUE' ? 'text-rose-500' : 'text-gray-500'}`}>
                          {formatDate(c.dueDate)}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${st.bg} ${st.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {c.status === 'PENDING' && (
                              <button 
                                onClick={() => { setShowPay(c); setPayAmount(String(c.amount)); }}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                title="Pagar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {c.status === 'PENDING' && (
                              <button 
                                onClick={() => { setShowEdit(c); setEditForm({ description: c.description, amount: String(c.amount), dueDate: c.dueDate?.slice(0, 10) || '', unitId: c.unitId || '' }); }}
                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => window.confirm('Deseja cancelar esta cobrança?') && cancelMut.mutate(c.id)}
                              className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                              title="Cancelar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {/* Modal Nova Cobrança */}
        {showCreate && (
          <Modal title="Lançar Nova Cobrança" onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Descrição do Lançamento</label>
                <input 
                  autoFocus value={createForm.description} onChange={v => setCreateForm({ ...createForm, description: v.target.value })}
                  className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Condomínio Mensal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                  <input 
                    type="number" value={createForm.amount} onChange={v => setCreateForm({ ...createForm, amount: v.target.value })}
                    className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Data de Vencimento</label>
                  <input 
                    type="date" value={createForm.dueDate} onChange={v => setCreateForm({ ...createForm, dueDate: v.target.value })}
                    className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Unidade</label>
                  <select 
                    value={createForm.unitId} onChange={e => setCreateForm({ ...createForm, unitId: e.target.value })}
                    className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Selecionar...</option>
                    {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.identifier} (Bloco {u.block || '—'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Conta de Destino</label>
                  <select 
                    value={createForm.accountId} onChange={e => setCreateForm({ ...createForm, accountId: e.target.value })}
                    className="w-full mt-2 px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="">Selecionar...</option>
                    {(accounts || []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setShowCreate(false)} className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                 <button 
                  onClick={() => createMut.mutate(createForm)}
                  disabled={createMut.isPending || !createForm.description || !createForm.unitId}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                 >
                   {createMut.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Lançamento'}
                 </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Pagamento */}
        {showPay && (
          <Modal title="Baixa Manual de Recebimento" onClose={() => setShowPay(null)}>
            <div className="p-6 bg-gray-50 rounded-3xl space-y-3 mb-6">
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição</span>
                 <span className="text-sm font-bold text-gray-700">{showPay.description}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unidade</span>
                 <span className="text-sm font-bold text-gray-700">{showPay.unit?.identifier || '—'}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor Original</span>
                 <span className="text-sm font-black text-gray-800">{formatCurrency(showPay.amount)}</span>
               </div>
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
        )}
      </AnimatePresence>
    </div>
  );
}
