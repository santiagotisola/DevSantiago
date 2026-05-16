import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Camera, Search, Plus, X, Building2, Users, Bell, ShieldAlert, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Visitor = {
  id: string;
  name: string;
  document?: string;
  documentType?: string;
  phone?: string;
  company?: string;
  reason?: string;
  photoUrl?: string;
  status: string;
  entryAt?: string;
  exitAt?: string;
  preAuthorized: boolean;
  unit?: { identifier: string; block?: string };
};

type Unit = { id: string; identifier: string; block?: string };

const STATUS_CHIPS = [
  { id: '', label: 'Todos', icon: Users },
  { id: 'INSIDE', label: 'No condomínio', icon: Building2 },
  { id: 'PENDING', label: 'Pendentes', icon: Bell },
  { id: 'AUTHORIZED', label: 'Autorizados', icon: CheckCircle },
  { id: 'LEFT', label: 'Saíram', icon: LogOut },
  { id: 'DENIED', label: 'Negados', icon: ShieldAlert },
];

const emptyForm = { name: '', document: '', documentType: 'RG', phone: '', company: '', unitId: '', reason: '' };

function sortUnits(units: Unit[]) {
  return [...units].sort((a, b) => {
    const n = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;
    return n(a.identifier) - n(b.identifier);
  });
}

function StatusBadge({ visitor }: { visitor: Visitor }) {
  const s = visitor.status;
  if (s === 'DENIED') return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Negado</span>;
  if (s === 'LEFT' || visitor.exitAt) return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">Saíu</span>;
  if (s === 'INSIDE' || visitor.entryAt) return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">No condomínio</span>;
  if (s === 'AUTHORIZED' || visitor.preAuthorized) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Pré-autorizado</span>;
  return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Aguardando</span>;
}

export default function VisitantesPortaria() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['visitors-portaria', selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '200' };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}`, { params });
      return res.data.data.visitors as Visitor[];
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 30000,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return sortUnits(res.data.data.units as Unit[]);
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  const entryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/entry`),
    onSuccess: () => {
      toast.success('Entrada registrada!');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar entrada'),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/exit`),
    onSuccess: () => {
      toast.success('Saída registrada!');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar saída'),
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/authorize`, { authorized: false }),
    onSuccess: () => {
      toast.success('Entrada negada.');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
    },
    onError: () => toast.error('Erro ao negar entrada'),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post('/visitors', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      toast.success('Visitante registrado!');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Erro ao registrar visitante'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    createMutation.mutate(form);
  };

  const visitors = (data ?? []).filter(
    (v) =>
      (!search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.unit?.identifier.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 space-y-4">
      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar visitante ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-600 rounded-xl text-sm bg-slate-800 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2.5 bg-blue-600 text-white rounded-xl flex items-center gap-1.5 text-sm font-medium"
        >
          <Plus size={16} />
          Novo
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const active = statusFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300'
              }`}
            >
              <Icon size={12} />
              {chip.label}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visitors.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="text-sm">Nenhum visitante encontrado</p>
        </div>
      )}

      <div className="space-y-3">
        {visitors.map((v) => (
          <div key={v.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={20} className="text-slate-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white truncate">{v.name}</p>
                  <StatusBadge visitor={v} />
                </div>
                {v.unit && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Unid. {v.unit.identifier}{v.unit.block ? ` • Bloco ${v.unit.block}` : ''}
                  </p>
                )}
                {(v.company || v.phone) && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {v.company && <span>{v.company}</span>}
                    {v.company && v.phone && <span> · </span>}
                    {v.phone && <span>{v.phone}</span>}
                  </p>
                )}
                {v.reason && <p className="text-xs text-slate-400 truncate">{v.reason}</p>}
              </div>
            </div>

            {/* Actions */}
            {v.status !== 'LEFT' && v.status !== 'DENIED' && (
              <div className="mt-3 flex gap-2">
                {(v.status === 'PENDING' || v.status === 'AUTHORIZED') && (
                  <button
                    onClick={() => entryMutation.mutate(v.id)}
                    disabled={entryMutation.isPending}
                    className="btn-press flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={16} />
                    Entrada
                  </button>
                )}
                {v.status === 'INSIDE' && (
                  <button
                    onClick={() => exitMutation.mutate(v.id)}
                    disabled={exitMutation.isPending}
                    className="btn-press flex-1 bg-gray-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={16} />
                    Saída
                  </button>
                )}
                {(v.status === 'PENDING' || v.status === 'AUTHORIZED') && (
                  <button
                    onClick={() => { if (confirm(`Negar entrada de ${v.name}?`)) denyMutation.mutate(v.id); }}
                    disabled={denyMutation.isPending}
                    className="btn-press px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert size={16} />
                    Negar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal — Novo Visitante */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Novo Visitante</h3>
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="text-gray-400" aria-label="Fechar modal">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Documento</label>
                  <input
                    type="text"
                    value={form.document}
                    onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                    placeholder="RG, CPF..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    aria-label="Tipo de documento"
                    value={form.documentType}
                    onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="RG">RG</option>
                    <option value="CPF">CPF</option>
                    <option value="CNH">CNH</option>
                    <option value="PASSPORT">Passaporte</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 99999-0000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                <select
                  aria-label="Unidade"
                  value={form.unitId}
                  onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Selecionar unidade</option>
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `Bl. ${u.block} — ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Visita, entrega, serviço..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 text-sm font-semibold mt-1 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Registrar visitante
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
