import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  Receipt, Plus, Search, Loader2, CheckCircle, Shuffle, X,
  CalendarDays, Layers, ChevronDown, ChevronUp, Pencil, Eye,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

// â”€â”€â”€ Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS: Record<string, { label: string; className: string }> = {
  PENDING:  { label: 'Pendente',   className: 'bg-yellow-100 text-yellow-700' },
  PAID:     { label: 'Pago',       className: 'bg-green-100 text-green-700'  },
  OVERDUE:  { label: 'Em Atraso',  className: 'bg-red-100 text-red-700'      },
  CANCELED: { label: 'Cancelada',  className: 'bg-gray-100 text-gray-500'    },
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}
function toISODateTime(iso: string) { return `${iso}T00:00:00.000Z`; }

// â”€â”€â”€ Modal genérico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// â”€â”€â”€ Input auxiliar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InputField({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

// â”€â”€â”€ Estado inicial dos forms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyCreate = { description: '', amount: '', dueDate: todayISO(), unitId: '', accountId: '' };
const emptyRatio = { description: '', totalAmount: '', dueDate: todayISO(), method: 'equal', accountId: '' };
const emptyInstall = {
  description: '', totalAmount: '', firstDueDate: todayISO(), installments: '3',
  intervalDays: '30', method: 'equal', accountId: '',
};
const emptyChargeInstall = {
  description: '', amount: '', firstDueDate: todayISO(), installments: '3',
  intervalDays: '30', unitId: '', accountId: '',
};

export function ChargesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  // Abas
  const [tab, setTab] = useState<'charges' | 'installments'>('charges');

  // Filtros
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter]   = useState('');

  // Modais
  const [showCreate, setShowCreate]               = useState(false);
  const [showRatio, setShowRatio]                 = useState(false);
  const [showRatioInstall, setShowRatioInstall]   = useState(false);
  const [showChargeInstall, setShowChargeInstall] = useState(false);
  const [showPay, setShowPay]                     = useState<any | null>(null);
  const [showEdit, setShowEdit]                   = useState<any | null>(null);
  const [ratioPreview, setRatioPreview]           = useState<any[] | null>(null);
  const [installPreview, setInstallPreview]       = useState<any[] | null>(null);
  const [expandedGroup, setExpandedGroup]         = useState<string | null>(null);

  // Forms
  const [createForm, setCreateForm]           = useState(emptyCreate);
  const [ratioForm, setRatioForm]             = useState(emptyRatio);
  const [installForm, setInstallForm]         = useState(emptyInstall);
  const [chargeInstallForm, setChargeInstallForm] = useState(emptyChargeInstall);
  const [editForm, setEditForm]               = useState({ description: '', amount: '', dueDate: '', unitId: '' });
  const [payAmount, setPayAmount]             = useState('');

  // â”€â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createMut = useMutation({
    mutationFn: (d: typeof createForm) => api.post('/finance/charges', {
      ...d,
      amount: parseFloat(d.amount),
      condominiumId: selectedCondominiumId,
      dueDate: toISODateTime(d.dueDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowCreate(false); setCreateForm(emptyCreate); },
  });

  const ratioMut = useMutation({
    mutationFn: (d: typeof ratioForm) => api.post('/finance/charges/ratio', {
      ...d,
      totalAmount: parseFloat(d.totalAmount),
      condominiumId: selectedCondominiumId,
      dueDate: toISODateTime(d.dueDate),
      referenceMonth: d.dueDate.slice(0, 7),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowRatio(false); setRatioForm(emptyRatio); setRatioPreview(null); },
  });

  const ratioInstallMut = useMutation({
    mutationFn: (d: typeof installForm) => api.post('/finance/charges/ratio/installments', {
      ...d,
      totalAmount: parseFloat(d.totalAmount),
      installments: parseInt(d.installments),
      intervalDays: parseInt(d.intervalDays),
      condominiumId: selectedCondominiumId,
      firstDueDate: toISODateTime(d.firstDueDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowRatioInstall(false); setInstallForm(emptyInstall); setInstallPreview(null); },
  });

  const chargeInstallMut = useMutation({
    mutationFn: (d: typeof chargeInstallForm) => api.post('/finance/charges/installments', {
      ...d,
      amount: parseFloat(d.amount),
      installments: parseInt(d.installments),
      intervalDays: parseInt(d.intervalDays),
      condominiumId: selectedCondominiumId,
      firstDueDate: toISODateTime(d.firstDueDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowChargeInstall(false); setChargeInstallForm(emptyChargeInstall); },
  });

  const payMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/finance/charges/${id}/pay`, { paidAmount: amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowPay(null); setPayAmount(''); },
  });

  const updateMut = useMutation({
    mutationFn: () => api.patch(`/finance/charges/${showEdit?.id}`, {
      ...editForm, amount: parseFloat(editForm.amount), dueDate: toISODateTime(editForm.dueDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['charges'] }); setShowEdit(null); },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/charges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charges'] }),
  });

  // â”€â”€â”€ Preview client-side â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function buildInstallPreview(desc: string, firstDate: string, n: string, interval: string) {
    const count = parseInt(n) || 1;
    const days  = parseInt(interval) || 30;
    return Array.from({ length: count }, (_, i) => ({
      installment: i + 1,
      n: count,
      dueDate: addDays(firstDate, i * days),
      description: `${desc} (${i + 1}/${count})`,
    }));
  }

  function buildRatioPreview() {
    const total  = parseFloat(ratioForm.totalAmount) || 0;
    const method = ratioForm.method;
    const us     = units || [];
    const totalFrac = us.reduce((s: number, u: any) => s + (u.fraction ?? 1), 0);
    return us.map((u: any) => ({
      identifier: u.identifier,
      block: u.block,
      amount: method === 'fraction'
        ? Math.round((total * (u.fraction ?? 1) / totalFrac) * 100) / 100
        : Math.round((total / Math.max(us.length, 1)) * 100) / 100,
    }));
  }

  // â”€â”€â”€ Dados filtrados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const charges = (chargesData || []).filter((c: any) =>
    !search || c.description?.toLowerCase().includes(search.toLowerCase()) || c.unit?.identifier?.includes(search)
  );

  // Agrupamento por parcelamento
  const installGroups = (() => {
    const map = new Map<string, any[]>();
    (chargesData || []).forEach((c: any) => {
      const match = (c.description || '').match(/^(.+)\s\((\d+)\/(\d+)\)$/);
      if (match) {
        const key = `${match[1]}__${match[3]}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ ...c, installNum: parseInt(match[2]), installTotal: parseInt(match[3]), baseDesc: match[1] });
      }
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      baseDesc: items[0].baseDesc,
      total: items[0].installTotal,
      items: items.sort((a: any, b: any) => a.installNum - b.installNum),
      paid: items.filter((i: any) => i.status === 'PAID').length,
      totalAmount: items.reduce((s: number, i: any) => s + i.amount, 0),
    }));
  })();

  const firstAccountId = (accounts || [])[0]?.id || '';

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground">Boletos, taxas condominiais e parcelamentos</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowChargeInstall(true)}
              className="flex items-center gap-2 border border-purple-300 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-50">
              <Layers className="w-4 h-4" /> Parcelas / Unidade
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
              <Plus className="w-4 h-4" /> Nova Cobrança
            </button>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab('charges')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'charges' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Receipt className="w-4 h-4" /> Cobranças
        </button>
        <button onClick={() => setTab('installments')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'installments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <CalendarDays className="w-4 h-4" /> Parcelamentos
          {installGroups.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">{installGroups.length}</span>
          )}
        </button>
      </div>

      {/* â”€â”€ Tab: Cobranças â”€â”€ */}
      {tab === 'charges' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descrição ou unidade..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os status</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : charges.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                <Receipt className="w-10 h-10" /><p>Nenhuma cobrança encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Ref.</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
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
                                  <button onClick={() => window.confirm('Cancelar esta cobrança?') && cancelMut.mutate(c.id)}
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
      )}

      {/* â”€â”€ Tab: Parcelamentos â”€â”€ */}
      {tab === 'installments' && (
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
                          {isAdmin && <th className="text-right px-4 py-2 font-medium text-gray-600">Ações</th>}
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
      )}

      {/* â•â• Modal: Nova Cobrança â•â• */}
      {showCreate && (
        <Modal title="Nova Cobrança" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <InputField label="Descrição *" value={createForm.description} onChange={v => setCreateForm({ ...createForm, description: v })} />
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
      )}

      {/* â•â• Modal: Rateio Simples â•â• */}
      {showRatio && (
        <Modal title="Rateio de Cobrança" onClose={() => { setShowRatio(false); setRatioPreview(null); }}>
          <p className="text-sm text-muted-foreground">O valor total será dividido entre <strong>todas as unidades</strong>.</p>
          <div className="space-y-3">
            <InputField label="Descrição *" value={ratioForm.description} onChange={v => setRatioForm({ ...ratioForm, description: v })} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Valor Total (R$) *" type="number" value={ratioForm.totalAmount} onChange={v => setRatioForm({ ...ratioForm, totalAmount: v })} />
              <InputField label="Vencimento *" type="date" value={ratioForm.dueDate} onChange={v => setRatioForm({ ...ratioForm, dueDate: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Método de Divisão</label>
                <select value={ratioForm.method} onChange={e => setRatioForm({ ...ratioForm, method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="equal">Igualitário</option>
                  <option value="fraction">Por fração ideal</option>
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
              <Eye className="w-4 h-4" /> Visualizar divisão por unidade
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
      )}

      {/* â•â• Modal: Rateio Parcelado â•â• */}
      {showRatioInstall && (
        <Modal title="Rateio Parcelado" onClose={() => { setShowRatioInstall(false); setInstallPreview(null); }}>
          <p className="text-sm text-muted-foreground">Cria <strong>N parcelas</strong> de rateio para todas as unidades, com datas espaçadas.</p>
          <div className="space-y-3">
            <InputField label="Descrição base *" value={installForm.description}
              onChange={v => setInstallForm({ ...installForm, description: v })} placeholder="Ex: Taxa Extra Manutenção" />
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
                <label className="text-sm font-medium">Divisão</label>
                <select value={installForm.method} onChange={e => setInstallForm({ ...installForm, method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="equal">Igualitário</option>
                  <option value="fraction">Por fração</option>
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
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">Calendário de vencimentos</div>
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
      )}

      {/* â•â• Modal: Parcelas por Unidade â•â• */}
      {showChargeInstall && (
        <Modal title="Parcelas por Unidade" onClose={() => setShowChargeInstall(false)}>
          <p className="text-sm text-muted-foreground">Gera cobranças parceladas para uma unidade específica.</p>
          <div className="space-y-3">
            <InputField label="Descrição base *" value={chargeInstallForm.description}
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
                <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">Prévia do agendamento</div>
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
      )}

      {/* â•â• Modal: Confirmar Pagamento â•â• */}
      {showPay && (
        <Modal title="Confirmar Pagamento" onClose={() => setShowPay(null)}>
          <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
            <div><span className="text-gray-500">Descrição:</span> <span className="font-medium">{showPay.description}</span></div>
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
      )}

      {/* â•â• Modal: Editar Cobrança â•â• */}
      {showEdit && (
        <Modal title="Editar Cobrança" onClose={() => setShowEdit(null)}>
          <div className="space-y-3">
            <InputField label="Descrição *" value={editForm.description} onChange={v => setEditForm({ ...editForm, description: v })} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Valor (R$) *" type="number" value={editForm.amount} onChange={v => setEditForm({ ...editForm, amount: v })} />
              <InputField label="Vencimento *" type="date" value={editForm.dueDate} onChange={v => setEditForm({ ...editForm, dueDate: v })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Unidade *</label>
              <select value={editForm.unitId} onChange={e => setEditForm({ ...editForm, unitId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` / Bloco ${u.block}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowEdit(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending || !editForm.description || !editForm.amount || !editForm.unitId}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {updateMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
