import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, Search, QrCode, Plus, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Parcel = {
  id: string;
  trackingCode?: string;
  carrier?: string;
  receivedAt: string;
  pickedUpAt?: string;
  unit?: { identifier: string; block?: string };
  resident?: { name: string };
};

type Unit = { id: string; identifier: string; block?: string };

const COMMON_CARRIERS = [
  'Correios', 'Loggi', 'Mercado Envios', 'Total Express', 'Jadlog',
  'Amazon Logistics', 'Shopee Xpress', 'DHL', 'FedEx',
];

const emptyForm = {
  unitId: '', carrier: '', trackingCode: '', storageLocation: '',
  senderName: '', deliveryPersonName: '', deliveryPersonDoc: '',
  vehiclePlate: '', hasPackageDamage: false, notes: '',
};

function sortUnits(units: Unit[]) {
  return [...units].sort((a, b) => {
    const n = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;
    return n(a.identifier) - n(b.identifier);
  });
}

export default function EncomendasPortaria() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDelivered, setShowDelivered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['parcels-portaria', selectedCondominiumId, showDelivered],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}?${params}`);
      const all = (res.data.data?.parcels ?? res.data.data) as Parcel[];
      return showDelivered ? all : all.filter((p) => !p.pickedUpAt);
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 60000,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return sortUnits(res.data.data.units as Unit[]);
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/parcels/${id}/pickup`),
    onSuccess: () => {
      toast.success('Entrega registrada!');
      qc.invalidateQueries({ queryKey: ['parcels-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar entrega'),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post('/parcels', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      toast.success('Encomenda registrada!');
      qc.invalidateQueries({ queryKey: ['parcels-portaria'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Erro ao registrar encomenda'),
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.unitId) { toast.error('Selecione a unidade'); return; }
    createMutation.mutate(form);
  };

  const parcels = (data ?? []).filter(
    (p) =>
      !search ||
      p.unit?.identifier.toLowerCase().includes(search.toLowerCase()) ||
      p.resident?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.trackingCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Unidade, morador ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowDelivered((v) => !v)}
          className={[
            'px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors',
            showDelivered
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200',
          ].join(' ')}
        >
          Entregues
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-2.5 bg-amber-500 text-white rounded-xl flex items-center gap-1 text-sm font-medium"
          aria-label="Registrar nova encomenda"
        >
          <Plus size={16} />
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && parcels.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Package size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma encomenda pendente</p>
        </div>
      )}

      <div className="space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  Unid. {p.unit?.identifier ?? '—'}
                  {p.unit?.block ? ` • Bloco ${p.unit.block}` : ''}
                </p>
                {p.resident?.name && (
                  <p className="text-xs text-gray-500">{p.resident.name}</p>
                )}
                {p.carrier && (
                  <p className="text-xs text-gray-500">{p.carrier}</p>
                )}
                {p.trackingCode && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <QrCode size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400 font-mono">{p.trackingCode}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Recebido em {format(new Date(p.receivedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {p.pickedUpAt && (
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>

            {!p.pickedUpAt && (
              <button
                onClick={() => deliverMutation.mutate(p.id)}
                disabled={deliverMutation.isPending}
                className="btn-press mt-3 w-full bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} />
                Entregar ao morador
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal — Nova Encomenda */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
            {/* Header fixo */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900">Registrar Encomenda</h3>
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="text-gray-400 p-1" aria-label="Fechar modal">
                <X size={22} />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {/* Unidade */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidade *</label>
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

              {/* Transportadora */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Transportadora</label>
                <select
                  aria-label="Transportadora"
                  value={form.carrier}
                  onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Selecionar (opcional)</option>
                  {COMMON_CARRIERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Código de rastreio */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código de rastreio</label>
                <input
                  type="text"
                  value={form.trackingCode}
                  onChange={(e) => setForm((f) => ({ ...f, trackingCode: e.target.value }))}
                  placeholder="Ex: BR123456789XX (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Local de armazenamento */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Local de armazenamento</label>
                <input
                  type="text"
                  value={form.storageLocation}
                  onChange={(e) => setForm((f) => ({ ...f, storageLocation: e.target.value }))}
                  placeholder="Ex: Armário 3, Recepção (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Remetente */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do remetente</label>
                <input
                  type="text"
                  value={form.senderName}
                  onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                  placeholder="Quem enviou (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Entregador */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome do entregador</label>
                <input
                  type="text"
                  value={form.deliveryPersonName}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryPersonName: e.target.value }))}
                  placeholder="Nome de quem trouxe (opcional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Documento entregador + Placa (lado a lado) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Doc. entregador</label>
                  <input
                    type="text"
                    value={form.deliveryPersonDoc}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryPersonDoc: e.target.value }))}
                    placeholder="CPF / RG"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa do veículo</label>
                  <input
                    type="text"
                    value={form.vehiclePlate}
                    onChange={(e) => setForm((f) => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
                    placeholder="ABC-1234"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
              </div>

              {/* Avaria */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${form.hasPackageDamage ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white'}`}
                  onClick={() => setForm((f) => ({ ...f, hasPackageDamage: !f.hasPackageDamage }))}
                >
                  {form.hasPackageDamage && <AlertTriangle size={12} className="text-white" />}
                </div>
                <span className="text-sm text-gray-700">Pacote com avaria/dano</span>
              </label>

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Informações adicionais (opcional)"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            {/* Botão fixo no rodapé */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="btn-press w-full bg-amber-500 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Package size={16} />
                )}
                Registrar encomenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
