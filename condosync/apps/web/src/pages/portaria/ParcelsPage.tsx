import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { Package, Plus, Search, CheckCircle, Loader2, Pencil, X, AlertTriangle, Truck, User, FileText } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebida', color: 'bg-blue-100 text-blue-700' },
  NOTIFIED: { label: 'Notificado', color: 'bg-yellow-100 text-yellow-700' },
  PICKED_UP: { label: 'Retirada', color: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Devolvida', color: 'bg-gray-100 text-gray-700' },
};

const emptyForm = {
  unitId: '', carrier: '', trackingCode: '', storageLocation: '', senderName: '',
  deliveryPersonName: '', deliveryPersonDoc: '', vehiclePlate: '',
  hasPackageDamage: false, notes: '',
};
const emptyEditForm = {
  carrier: '', trackingCode: '', storageLocation: '', senderName: '',
  deliveryPersonName: '', deliveryPersonDoc: '', vehiclePlate: '',
  hasPackageDamage: false, notes: '',
};

export function ParcelsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pickupModal, setPickupModal] = useState<string | null>(null);
  const [pickupName, setPickupName] = useState('');
  const [pickupResidentId, setPickupResidentId] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const { data, isLoading } = useQuery({
    queryKey: ['parcels', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}`, { params: { limit: 50 } });
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: residents } = useQuery({
    queryKey: ['residents', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/residents/condominium/${selectedCondominiumId}`);
      return res.data.data.residents;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as { id: string; identifier: string; block?: string }[];
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/parcels', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const pickupMutation = useMutation({
    mutationFn: ({ id, pickedUpBy }: { id: string; pickedUpBy: string }) =>
      api.patch(`/parcels/${id}/pickup`, { pickedUpBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setPickupModal(null);
      setPickupName('');
      setPickupResidentId('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/parcels/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setCancelingId(null);
      setCancelReason('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & typeof emptyEditForm) =>
      api.patch(`/parcels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const parcels = (data?.parcels || []).filter((p: any) =>
    (p.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.carrier || '').toLowerCase().includes(search.toLowerCase())
  );

  const canRegister = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const activeParcel = pickupModal ? (data?.parcels || []).find((p: any) => p.id === pickupModal) : null;
  const activeUnitId = activeParcel?.unit?.id || activeParcel?.unitId || null;
  const unitResidents = Array.isArray(residents)
    ? residents.filter((r: any) => r.unit?.id === activeUnitId)
    : [];
  const pickupOptions = Array.isArray(residents)
    ? (unitResidents.length > 0 ? unitResidents : residents)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Encomendas</h1>
          <p className="text-muted-foreground">Registro e controle de encomendas recebidas</p>
        </div>
        {canRegister && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Encomenda
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por unidade ou transportadora..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : parcels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Package className="w-10 h-10" />
            <p>Nenhuma encomenda encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Transportadora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entregador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Placa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rastreio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Local</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Recebido em</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  {canRegister && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {parcels.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {p.unit?.block ? `${p.unit.block} - ` : ''}{p.unit?.identifier}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.carrier || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{p.deliveryPersonName || '—'}</div>
                      {p.deliveryPersonDoc && <div className="text-xs text-gray-400">Doc: {p.deliveryPersonDoc}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.vehiclePlate || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.trackingCode || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.storageLocation || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[p.status]?.color}`}>
                          {STATUS_LABELS[p.status]?.label}
                        </span>
                        {p.hasPackageDamage && (
                          <span title="Avaria registrada" className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertTriangle className="w-3 h-3" /> Avaria
                          </span>
                        )}
                      </div>
                    </td>
                    {canRegister && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                            <button
                              onClick={() => setPickupModal(p.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Retirada
                            </button>
                          )}
                          {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                            <button
                              onClick={() => { setEditTarget(p); setEditForm({ carrier: p.carrier || '', trackingCode: p.trackingCode || '', storageLocation: p.storageLocation || '', senderName: p.senderName || '', deliveryPersonName: p.deliveryPersonName || '', deliveryPersonDoc: p.deliveryPersonDoc || '', vehiclePlate: p.vehiclePlate || '', hasPackageDamage: p.hasPackageDamage || false, notes: p.notes || '' }); setEditModal(true); }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                          )}
                          {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                            <button
                              onClick={() => setCancelingId(p.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              <X className="w-3 h-3" />
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de registro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Registrar Encomenda</h2>

            {/* Destinatário */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Unidade destinatária *</label>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a unidade...</option>
                {(unitsData || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.block ? `${u.block} - ` : ''}{u.identifier}
                  </option>
                ))}
              </select>
            </div>

            {/* Transportadora e Rastreio */}
            <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Truck className="w-3 h-3" /> Dados da Transportadora
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Transportadora</label>
                  <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Correios, Mercado Envios..." />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Placa do Veículo</label>
                  <input value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="ABC-1234" maxLength={8} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Código de Rastreio / NF</label>
                <input value={form.trackingCode} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="AA123456789BR ou nº da NF" />
              </div>
            </div>

            {/* Entregador */}
            <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <User className="w-3 h-3" /> Identificação do Entregador
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium">Nome do Entregador</label>
                  <input value={form.deliveryPersonName} onChange={(e) => setForm({ ...form, deliveryPersonName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Nome completo" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium">Documento (CPF ou RG)</label>
                  <input value={form.deliveryPersonDoc} onChange={(e) => setForm({ ...form, deliveryPersonDoc: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Somente números" maxLength={14} />
                  <p className="text-xs text-gray-400">Coletado para segurança patrimonial (LGPD Art. 7º, IX)</p>
                </div>
              </div>
            </div>

            {/* Armazenamento e Remetente */}
            <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3 h-3" /> Armazenamento e Observações
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Local de Armazenamento</label>
                  <input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Prateleira A-01" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Remetente</label>
                  <input value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Nome do remetente" />
                </div>
              </div>
              {/* Avaria */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                <input
                  type="checkbox"
                  id="hasPackageDamage"
                  checked={form.hasPackageDamage}
                  onChange={(e) => setForm({ ...form, hasPackageDamage: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-orange-500"
                />
                <label htmlFor="hasPackageDamage" className="text-sm cursor-pointer">
                  <span className="font-medium text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Embalagem com avaria visível
                  </span>
                  <span className="text-xs text-orange-600 block">Marque se houver danos na embalagem (Art. 754 Cód. Civil)</span>
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  placeholder="Descrição da avaria, instruções especiais..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.unitId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de retirada */}
      {pickupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Confirmar Retirada</h2>
            {pickupOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Morador</label>
                <select
                  value={pickupResidentId}
                  onChange={(e) => {
                    const residentId = e.target.value;
                    setPickupResidentId(residentId);
                    const resident = pickupOptions.find((r: any) => r.id === residentId);
                    if (resident?.user?.name) {
                      setPickupName(resident.user.name);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {pickupOptions.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.user?.name}{r.unit?.identifier ? ` - ${r.unit.identifier}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Moradores da unidade, ou de todo o condomínio quando a unidade não possui morador vinculado.</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome de quem retirou *</label>
              <input
                value={pickupName}
                onChange={(e) => setPickupName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPickupModal(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => pickupMutation.mutate({ id: pickupModal, pickedUpBy: pickupName })}
                disabled={pickupMutation.isPending || !pickupName}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cancelamento */}
      {cancelingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Cancelar Encomenda</h2>
            <p className="text-sm text-muted-foreground">
              Confirma o cancelamento/devolução desta encomenda? Ela será marcada como "Devolvida" no histórico.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelingId(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Voltar
              </button>
              <button
                onClick={() => cancelMutation.mutate({ id: cancelingId, reason: cancelReason || undefined })}
                disabled={cancelMutation.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Editar Encomenda</h2>
            <div className="space-y-3">
              <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Transportadora
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Transportadora</label>
                    <input value={editForm.carrier} onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Correios, Mercado Envios..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Placa do Veículo</label>
                    <input value={editForm.vehiclePlate} onChange={(e) => setEditForm({ ...editForm, vehiclePlate: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="ABC-1234" maxLength={8} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Código de Rastreio / NF</label>
                    <input value={editForm.trackingCode} onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Local de Armazenamento</label>
                    <input value={editForm.storageLocation} onChange={(e) => setEditForm({ ...editForm, storageLocation: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3" /> Entregador
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome do Entregador</label>
                    <input value={editForm.deliveryPersonName} onChange={(e) => setEditForm({ ...editForm, deliveryPersonName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Documento (CPF/RG)</label>
                    <input value={editForm.deliveryPersonDoc} onChange={(e) => setEditForm({ ...editForm, deliveryPersonDoc: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" maxLength={14} />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
                <input type="checkbox" id="editHasDamage" checked={editForm.hasPackageDamage}
                  onChange={(e) => setEditForm({ ...editForm, hasPackageDamage: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-orange-500" />
                <label htmlFor="editHasDamage" className="text-sm cursor-pointer">
                  <span className="font-medium text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Embalagem com avaria visível
                  </span>
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Remetente</label>
                <input value={editForm.senderName} onChange={(e) => setEditForm({ ...editForm, senderName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTarget(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate({ ...editForm, id: editTarget.id })}
                disabled={updateMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
