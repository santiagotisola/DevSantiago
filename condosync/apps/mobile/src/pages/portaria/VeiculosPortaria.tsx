import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Search, Plus, X, LogOut, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type AccessLog = {
  id: string;
  plate: string;
  isResident: boolean;
  notes?: string;
  entryAt: string;
  exitAt?: string;
  unit?: { identifier: string; block?: string };
};

const emptyForm = { plate: '', unitId: '', isResident: false, notes: '' };

export default function VeiculosPortaria() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-logs', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/access-logs/${selectedCondominiumId}`);
      return res.data.data.logs as AccessLog[];
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 30000,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      const list = res.data.data.units as { id: string; identifier: string; block?: string }[];
      return [...list].sort((a, b) => {
        const n = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;
        return n(a.identifier) - n(b.identifier);
      });
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post('/vehicles/access-logs', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      toast.success('Acesso registrado!');
      qc.invalidateQueries({ queryKey: ['vehicle-logs'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Erro ao registrar acesso'),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/vehicles/access-logs/${id}/exit`),
    onSuccess: () => {
      toast.success('Saída registrada!');
      qc.invalidateQueries({ queryKey: ['vehicle-logs'] });
    },
    onError: () => toast.error('Erro ao registrar saída'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate.trim()) { toast.error('Placa é obrigatória'); return; }
    createMutation.mutate(form);
  };

  const logs = (data ?? []).filter(
    (l) =>
      !search ||
      l.plate.toLowerCase().includes(search.toLowerCase()) ||
      l.unit?.identifier.toLowerCase().includes(search.toLowerCase())
  );

  // Logs do dia atual sem saída registrada primeiro
  const sorted = [...logs].sort((a, b) => {
    if (!a.exitAt && b.exitAt) return -1;
    if (a.exitAt && !b.exitAt) return 1;
    return new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime();
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar placa ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2.5 bg-primary-600 text-white rounded-xl flex items-center gap-1.5 text-sm font-medium"
        >
          <Plus size={16} />
          Entrada
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Car size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum acesso registrado hoje</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((l) => (
          <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className={[
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                l.exitAt ? 'bg-gray-100' : 'bg-blue-50',
              ].join(' ')}>
                <Car size={20} className={l.exitAt ? 'text-gray-400' : 'text-blue-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-gray-900 font-mono tracking-wide">{l.plate.toUpperCase()}</p>
                  <span className={[
                    'text-xs px-2 py-0.5 rounded-full',
                    l.exitAt
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-green-100 text-green-700',
                  ].join(' ')}>
                    {l.exitAt ? 'Saiu' : 'No condomínio'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {l.isResident ? 'Morador' : 'Visitante'}
                  {l.unit ? ` • Unid. ${l.unit.identifier}${l.unit.block ? ` Bl. ${l.unit.block}` : ''}` : ''}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    Entrada: {format(new Date(l.entryAt), "HH:mm", { locale: ptBR })}
                  </span>
                  {l.exitAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <LogOut size={11} />
                      Saída: {format(new Date(l.exitAt), "HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                {l.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.notes}</p>}
              </div>
            </div>

            {!l.exitAt && (
              <button
                onClick={() => exitMutation.mutate(l.id)}
                disabled={exitMutation.isPending}
                className="btn-press mt-3 w-full bg-gray-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut size={15} />
                Registrar saída
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal — Novo Acesso */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Registrar Entrada</h3>
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="text-gray-400" aria-label="Fechar modal">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                <input
                  type="text"
                  value={form.plate}
                  onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234 ou ABC1D23"
                  maxLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                <select
                  aria-label="Unidade"
                  value={form.unitId}
                  onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Selecionar unidade (opcional)</option>
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `Bl. ${u.block} — ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="checkbox"
                  id="isResident"
                  checked={form.isResident}
                  onChange={(e) => setForm((f) => ({ ...f, isResident: e.target.checked }))}
                  className="w-4 h-4 accent-primary-600"
                />
                <label htmlFor="isResident" className="text-sm text-gray-700 font-medium">
                  Veículo de morador
                </label>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-press w-full bg-primary-600 text-white rounded-xl py-3 text-sm font-semibold mt-1 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Car size={16} />
                )}
                Registrar entrada
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
