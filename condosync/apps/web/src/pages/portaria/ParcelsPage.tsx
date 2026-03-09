import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { Package, Plus, Search, CheckCircle, Loader2 } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Recebida', color: 'bg-blue-100 text-blue-700' },
  NOTIFIED: { label: 'Notificado', color: 'bg-yellow-100 text-yellow-700' },
  PICKED_UP: { label: 'Retirada', color: 'bg-green-100 text-green-700' },
  RETURNED: { label: 'Devolvida', color: 'bg-gray-100 text-gray-700' },
};

export function ParcelsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pickupModal, setPickupModal] = useState<string | null>(null);
  const [pickupName, setPickupName] = useState('');

  const [form, setForm] = useState({ unitId: '', carrier: '', trackingCode: '', storageLocation: '', senderName: '' });
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedFormResidentId, setSelectedFormResidentId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['parcels', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}`, { params: { limit: 50 } });
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: residents, isLoading: isLoadingResidents } = useQuery({
    queryKey: ['residents', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/residents/condominium/${selectedCondominiumId}`);
      return res.data.data.residents;
    },
    enabled: !!selectedCondominiumId,
  });

  const filteredResidents = Array.isArray(residents)
    ? residents.filter((r: any) =>
        (r.unit?.identifier ?? '').toLowerCase().includes(unitSearch.toLowerCase())
      )
    : [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/parcels', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      setShowModal(false);
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
                    <td className="px-4 py-3 text-muted-foreground">{p.storageLocation || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[p.status]?.color}`}>
                        {STATUS_LABELS[p.status]?.label}
                      </span>
                    </td>
                    {canRegister && (
                      <td className="px-4 py-3 text-right">
                        {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                          <button
                            onClick={() => {
                              setPickupModal(p.id);
                              setPickupName('');
                              setPickupResidentId('');
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 ml-auto"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Confirmar Retirada
                          </button>
                        )}
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
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Encomenda</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Unidade</label>
                  <input
                    value={unitSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUnitSearch(value);
                      setSelectedResidentId('');
                      setForm({ ...form, unitId: '' });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número da unidade (ex: 101)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Morador</label>
                  <select
                    value={selectedResidentId}
                    onChange={(e) => {
                      const residentId = e.target.value;
                      setSelectedResidentId(residentId);
                      const resident = filteredResidents.find((r: any) => r.id === residentId);
                      if (resident?.unit?.id) {
                        setForm({ ...form, unitId: resident.unit.id });
                        setUnitSearch(resident.unit.identifier ?? '');
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingResidents || filteredResidents.length === 0}
                  >
                    <option value="">{filteredResidents.length === 0 ? 'Nenhum morador para esta unidade' : 'Selecione...'}</option>
                    {filteredResidents.map((r: any) => (
                      r.unit && (
                        <option key={r.id} value={r.id}>
                          {r.user?.name}
                        </option>
                      )
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Digite a unidade e selecione o morador correspondente.</p>
                </div>
              </div>
              {[
                { key: 'carrier', label: 'Transportadora', placeholder: 'Correios, Mercado Envios...' },
                { key: 'trackingCode', label: 'Código de Rastreio', placeholder: 'AA123456789BR' },
                { key: 'storageLocation', label: 'Local de Armazenamento', placeholder: 'Prateleira A-01' },
                { key: 'senderName', label: 'Remetente', placeholder: 'Nome do remetente' },
              ].map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-sm font-medium">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
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
    </div>
  );
}
