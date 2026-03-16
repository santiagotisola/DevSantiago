import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { Package, Plus, Search, CheckCircle, Loader2, Pencil, X, AlertTriangle, Truck, User, FileText, Trash2, ClipboardList, Clock, Bell } from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────
type PreCarrier = { id: string; name: string };
type PreLocation = { id: string; name: string };
type PreDeliverer = { id: string; name: string; doc: string; company: string; plate: string };

// ─── Transportadoras comuns do sistema ─────────────────────────────────────
const COMMON_CARRIERS = [
  'Correios', 'Loggi', 'Mercado Envios', 'Total Express', 'Jadlog',
  'Amazon Logistics', 'Shopee Xpress', 'DHL', 'FedEx', 'Sequoia', 'Azul Cargo',
];

// ─── Hook localStorage ──────────────────────────────────────────────────────
function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? initial; } catch { return initial; }
  });
  const set = (v: T) => { setState(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [state, set];
}

// ─── Combobox (autocomplete genérico) ──────────────────────────────────────
function Combobox({
  value, onChange, suggestions, placeholder = '', inputClassName = '',
}: {
  value: string; onChange: (v: string) => void; suggestions: string[];
  placeholder?: string; inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${inputClassName}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seletor de entregador pré-cadastrado ───────────────────────────────────
function DelivererSelect({
  value, onSelect, deliverers,
}: {
  value: string; onSelect: (d: Partial<PreDeliverer>) => void; deliverers: PreDeliverer[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = deliverers.filter(d => d.name.toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onSelect({ name: e.target.value }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Nome completo"
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
          {filtered.map(d => (
            <button
              key={d.id}
              type="button"
              onMouseDown={() => { onSelect(d); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-gray-400">
                {d.company}{d.doc ? ` · Doc: ${d.doc}` : ''}{d.plate ? ` · Placa: ${d.plate}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Loading Components ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function ParcelTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Constantes ─────────────────────────────────────────────────────────────
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
const emptyNewDeliverer = { name: '', doc: '', company: '', plate: '' };

export function ParcelsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'parcels' | 'pre-registration'>('parcels');
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

  // Pré-cadastros (localStorage)
  const [preCarriers, setPreCarriers] = useLocalStorage<PreCarrier[]>('condosync:pre-carriers', []);
  const [preLocations, setPreLocations] = useLocalStorage<PreLocation[]>('condosync:pre-locations', []);
  const [preDeliverers, setPreDeliverers] = useLocalStorage<PreDeliverer[]>('condosync:pre-deliverers', []);
  const [newCarrierName, setNewCarrierName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newDeliverer, setNewDeliverer] = useState(emptyNewDeliverer);
  // Estados de edição inline
  const [editingCarrier, setEditingCarrier] = useState<{ id: string; name: string } | null>(null);
  const [editingLocation, setEditingLocation] = useState<{ id: string; name: string } | null>(null);

  // Sugestões de transportadora = padrão + pré-cadastradas
  const carrierSuggestions = [...new Set([...COMMON_CARRIERS, ...preCarriers.map(c => c.name)])];

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

  // Sugestões de local de armazenamento = pré-cadastrados + histórico de encomendas
  const storageLocationSuggestions = [...new Set([
    ...preLocations.map(l => l.name),
    ...(data?.parcels || []).map((p: any) => p.storageLocation).filter(Boolean) as string[],
  ])];

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

  const notifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/parcels/${id}/notify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
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

  // Handlers de pré-cadastro
  const addCarrier = () => {
    if (!newCarrierName.trim()) return;
    setPreCarriers([...preCarriers, { id: crypto.randomUUID(), name: newCarrierName.trim() }]);
    setNewCarrierName('');
  };
  const removeCarrier = (id: string) => setPreCarriers(preCarriers.filter(c => c.id !== id));
  const saveCarrier = () => {
    if (!editingCarrier || !editingCarrier.name.trim()) return;
    setPreCarriers(preCarriers.map(c => c.id === editingCarrier.id ? { ...c, name: editingCarrier.name.trim() } : c));
    setEditingCarrier(null);
  };

  const addLocation = () => {
    if (!newLocationName.trim()) return;
    setPreLocations([...preLocations, { id: crypto.randomUUID(), name: newLocationName.trim() }]);
    setNewLocationName('');
  };
  const removeLocation = (id: string) => setPreLocations(preLocations.filter(l => l.id !== id));
  const saveLocation = () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    setPreLocations(preLocations.map(l => l.id === editingLocation.id ? { ...l, name: editingLocation.name.trim() } : l));
    setEditingLocation(null);
  };

  const addDeliverer = () => {
    if (!newDeliverer.name.trim()) return;
    setPreDeliverers([...preDeliverers, { id: crypto.randomUUID(), ...newDeliverer }]);
    setNewDeliverer(emptyNewDeliverer);
  };
  const removeDeliverer = (id: string) => setPreDeliverers(preDeliverers.filter(d => d.id !== id));

  // Cálculos de Métricas
  const rawParcels = data?.parcels || [];
  const metrics = {
    pending: rawParcels.filter((p: any) => ['RECEIVED', 'NOTIFIED'].includes(p.status)).length,
    today: rawParcels.filter((p: any) => new Date(p.receivedAt).toDateString() === new Date().toDateString()).length,
    damaged: rawParcels.filter((p: any) => p.hasPackageDamage).length,
    pickedUp: rawParcels.filter((p: any) => p.status === 'PICKED_UP').length
  };

  const parcels = rawParcels.filter((p: any) => {
    const matchesSearch = 
      (p.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.carrier ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.trackingCode ?? '').toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'DAMAGED' ? p.hasPackageDamage : p.status === statusFilter) ||
      (statusFilter === 'PENDING' && ['RECEIVED', 'NOTIFIED'].includes(p.status));

    return matchesSearch && matchesStatus;
  });

  const canRegister = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');
  const canAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

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
      {/* Cabeçalho */}
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

      {/* Abas */}
      {canRegister && (
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('parcels')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'parcels' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="w-4 h-4" /> Encomendas
          </button>
          {canAdmin && (
            <button
              onClick={() => setActiveTab('pre-registration')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pre-registration' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <ClipboardList className="w-4 h-4" /> Pré-Cadastros
            </button>
          )}
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.pending}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
              <div className="bg-green-100 p-2.5 rounded-lg text-green-600">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Recebidas Hoje</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.today}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-center gap-4">
              <div className="bg-orange-100 p-2.5 rounded-lg text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avariadas</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.damaged}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-gray-100 p-2.5 rounded-lg text-gray-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Retiradas</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.pickedUp}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Aba: Encomendas ── */}
      {activeTab === 'parcels' && (
        <>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por unidade, transportadora ou código de rastreio..."
                className="w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              />
            </div>

            {/* Filtros rápidos (Chips) */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Filtrar por:</span>
              {[
                { id: 'ALL', label: 'Tudo', icon: Package },
                { id: 'PENDING', label: 'Pendentes', icon: Loader2 },
                { id: 'RECEIVED', label: 'Recebidas', icon: Truck },
                { id: 'NOTIFIED', label: 'Notificadas', icon: AlertTriangle },
                { id: 'PICKED_UP', label: 'Retiradas', icon: CheckCircle },
                { id: 'DAMAGED', label: 'Com Avaria', icon: AlertTriangle, color: 'text-orange-600' },
              ].map((chip) => {
                const Icon = chip.icon;
                const active = statusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setStatusFilter(chip.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      active 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : chip.color || 'text-gray-400'}`} />
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoading ? (
              <ParcelTableSkeleton />
            ) : parcels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground bg-gray-50/30">
                <div className="bg-white p-6 rounded-full shadow-sm border border-gray-100">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-600">Nenhuma encomenda encontrada</p>
                  <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
                </div>
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
                    {parcels.map((p: any) => {
                      const isOld = (p.status === 'RECEIVED' || p.status === 'NOTIFIED') && 
                                    (Date.now() - new Date(p.receivedAt).getTime()) > 48 * 60 * 60 * 1000;
                      
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${isOld ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{p.unit?.block ? `${p.unit.block} - ` : ''}{p.unit?.identifier}</span>
                              {isOld && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase mt-0.5">
                                  <Clock className="w-3 h-3" /> Pendente há +48h
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.carrier || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            <div className="font-medium text-gray-700">{p.deliveryPersonName || '—'}</div>
                            {p.deliveryPersonDoc && <div>Doc: {p.deliveryPersonDoc}</div>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-[10px]">{p.vehiclePlate || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{p.trackingCode || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.storageLocation || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDateTime(p.receivedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_LABELS[p.status]?.color}`}>
                                {STATUS_LABELS[p.status]?.label}
                              </span>
                              {p.hasPackageDamage && (
                                <span title="Avaria registrada" className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">
                                  <AlertTriangle className="w-3 h-3" /> Avaria
                                </span>
                              )}
                            </div>
                          </td>
                          {canRegister && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                                  <>
                                    <button
                                      onClick={() => setPickupModal(p.id)}
                                      title="Confirmar Retirada"
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Reenviar notificação para o morador?')) {
                                          notifyMutation.mutate(p.id);
                                        }
                                      }}
                                      title="Notificar Morador"
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                      {notifyMutation.isPending && notifyMutation.variables === p.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : <Bell className="w-4 h-4" />}
                                    </button>
                                  </>
                                )}
                                {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                                  <button
                                    onClick={() => { setEditTarget(p); setEditForm({ carrier: p.carrier || '', trackingCode: p.trackingCode || '', storageLocation: p.storageLocation || '', senderName: p.senderName || '', deliveryPersonName: p.deliveryPersonName || '', deliveryPersonDoc: p.deliveryPersonDoc || '', vehiclePlate: p.vehiclePlate || '', hasPackageDamage: p.hasPackageDamage || false, notes: p.notes || '' }); setEditModal(true); }}
                                    title="Editar"
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {(p.status === 'RECEIVED' || p.status === 'NOTIFIED') && (
                                  <button
                                    onClick={() => setCancelingId(p.id)}
                                    title="Cancelar/Devolver"
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4" />
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

      {/* ── Aba: Pré-Cadastros ── */}
      {activeTab === 'pre-registration' && canAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Transportadoras */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold">Transportadoras</h3>
            </div>
            <p className="text-xs text-gray-500">
              Transportadoras pré-cadastradas aparecem como sugestão ao registrar encomendas.
            </p>
            <div className="flex gap-2">
              <input
                value={newCarrierName}
                onChange={e => setNewCarrierName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCarrier()}
                placeholder="Nome da transportadora"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addCarrier} disabled={!newCarrierName.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pré-cadastradas</p>
              {preCarriers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cadastrada ainda.</p>
              ) : (
                preCarriers.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    {editingCarrier?.id === c.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingCarrier.name}
                          onChange={e => setEditingCarrier({ ...editingCarrier, name: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') saveCarrier(); if (e.key === 'Escape') setEditingCarrier(null); }}
                          className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={saveCarrier} className="text-green-600 hover:text-green-700 text-xs font-medium">Salvar</button>
                        <button onClick={() => setEditingCarrier(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{c.name}</span>
                        <button onClick={() => setEditingCarrier({ id: c.id, name: c.name })} className="text-blue-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeCarrier(c.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-3">Padrão do sistema</p>
              {COMMON_CARRIERS.map(c => (
                <div key={c} className="flex items-center px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Locais de Armazenamento */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold">Locais de Armazenamento</h3>
            </div>
            <p className="text-xs text-gray-500">
              Locais pré-cadastrados aparecem como sugestão no campo ao registrar encomendas.
            </p>
            <div className="flex gap-2">
              <input
                value={newLocationName}
                onChange={e => setNewLocationName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLocation()}
                placeholder="Ex: Prateleira A-01, Armário 3"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addLocation} disabled={!newLocationName.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cadastrados</p>
              {preLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum local cadastrado ainda.</p>
              ) : (
                preLocations.map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    {editingLocation?.id === l.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingLocation.name}
                          onChange={e => setEditingLocation({ ...editingLocation, name: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') saveLocation(); if (e.key === 'Escape') setEditingLocation(null); }}
                          className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={saveLocation} className="text-green-600 hover:text-green-700 text-xs font-medium">Salvar</button>
                        <button onClick={() => setEditingLocation(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{l.name}</span>
                        <button onClick={() => setEditingLocation({ id: l.id, name: l.name })} className="text-blue-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeLocation(l.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Entregadores */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold">Entregadores</h3>
            </div>
            <p className="text-xs text-gray-500">
              Entregadores pré-cadastrados preenchem automaticamente nome, documento, empresa e placa ao serem selecionados.
            </p>
            <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-500">Novo entregador</p>
              <input
                value={newDeliverer.name}
                onChange={e => setNewDeliverer({ ...newDeliverer, name: e.target.value })}
                placeholder="Nome completo *"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                value={newDeliverer.doc}
                onChange={e => setNewDeliverer({ ...newDeliverer, doc: e.target.value.replace(/\D/g, '') })}
                placeholder="CPF ou RG (somente números)"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                maxLength={14}
              />
              <input
                value={newDeliverer.company}
                onChange={e => setNewDeliverer({ ...newDeliverer, company: e.target.value })}
                placeholder="Empresa / Transportadora"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                value={newDeliverer.plate}
                onChange={e => setNewDeliverer({ ...newDeliverer, plate: e.target.value.toUpperCase() })}
                placeholder="Placa do veículo"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                maxLength={8}
              />
              <button
                onClick={addDeliverer}
                disabled={!newDeliverer.name.trim()}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Cadastrar Entregador
              </button>
            </div>
            <div className="space-y-2">
              {preDeliverers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum entregador cadastrado ainda.</p>
              ) : (
                preDeliverers.map(d => (
                  <div key={d.id} className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded-lg gap-2">
                    <div>
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-gray-400">
                        {d.company}{d.doc ? ` · Doc: ${d.doc}` : ''}{d.plate ? ` · Placa: ${d.plate}` : ''}
                      </div>
                    </div>
                    <button onClick={() => removeDeliverer(d.id)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Modal de registro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Cabeçalho Fixo */}
            <div className="p-4 border-b shrink-0 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-blue-600">
                <Package className="w-5 h-5" />
                <h2 className="text-lg font-semibold text-gray-800">Registrar Encomenda</h2>
              </div>
              <button 
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* Unidade e Remetente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                    Unidade destinatária <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow"
                  >
                    <option value="">Selecione a unidade...</option>
                    {(unitsData || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.block ? `${u.block} - ` : ''}{u.identifier}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Remetente</label>
                  <input 
                    value={form.senderName} 
                    onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Quem enviou?" 
                  />
                </div>
              </div>

              {/* Transportadora */}
              <div className="border rounded-xl p-4 space-y-4 bg-gray-50/50 border-gray-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" /> Dados da Entrega
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Transportadora</label>
                    <Combobox
                      value={form.carrier}
                      onChange={v => setForm({ ...form, carrier: v })}
                      suggestions={carrierSuggestions}
                      placeholder="Ex: Correios, Loggi..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Placa do Veículo</label>
                    <input 
                      value={form.vehiclePlate} 
                      onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="ABC-1234" maxLength={8} 
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Código de Rastreio / NF</label>
                    <input 
                      value={form.trackingCode} 
                      onChange={(e) => setForm({ ...form, trackingCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="AA123456789BR ou nº da nota fiscal" 
                    />
                  </div>
                </div>
              </div>

              {/* Entregador */}
              <div className="border rounded-xl p-4 space-y-4 bg-gray-50/50 border-gray-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Identificação do Entregador
                </p>
                
                {preDeliverers.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <label className="text-xs font-bold text-blue-700 uppercase mb-1.5 block">Atalho: Entregador Frequente</label>
                    <DelivererSelect
                      value={form.deliveryPersonName}
                      onSelect={d => setForm({
                        ...form,
                        deliveryPersonName: d.name ?? form.deliveryPersonName,
                        deliveryPersonDoc: d.doc ?? form.deliveryPersonDoc,
                        vehiclePlate: d.plate ?? form.vehiclePlate,
                        carrier: d.company ?? form.carrier,
                      })}
                      deliverers={preDeliverers}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Nome do Entregador</label>
                    <input 
                      value={form.deliveryPersonName} 
                      onChange={(e) => setForm({ ...form, deliveryPersonName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Nome completo" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Documento (CPF ou RG)</label>
                    <input 
                      value={form.deliveryPersonDoc} 
                      onChange={(e) => setForm({ ...form, deliveryPersonDoc: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Apenas números" maxLength={14} 
                    />
                  </div>
                </div>
              </div>

              {/* Armazenamento e Avaria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" /> Local de Armazenamento
                  </label>
                  <Combobox
                    value={form.storageLocation}
                    onChange={v => setForm({ ...form, storageLocation: v })}
                    suggestions={storageLocationSuggestions}
                    placeholder="Ex: Prateleira A-01"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer" onClick={() => setForm({ ...form, hasPackageDamage: !form.hasPackageDamage })}>
                    <input
                      type="checkbox"
                      id="hasPackageDamage"
                      checked={form.hasPackageDamage}
                      onChange={(e) => setForm({ ...form, hasPackageDamage: e.target.checked })}
                      className="h-4 w-4 accent-orange-500 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label htmlFor="hasPackageDamage" className="text-sm cursor-pointer flex flex-col">
                      <span className="font-bold text-orange-700 flex items-center gap-1 text-xs uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" /> Embalagem com Avaria
                      </span>
                      <span className="text-[10px] text-orange-600 leading-tight">Danos visíveis (Art. 754 CC)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Observações Internas</label>
                <textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white font-sans"
                  placeholder="Instruções de segurança ou detalhes sobre a avaria..." 
                />
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="p-4 border-t shrink-0 flex gap-3 bg-gray-50 rounded-b-xl">
              <button 
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="flex-1 px-4 py-2 border bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.unitId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
              >
                {createMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando...</span>
                  </div>
                ) : 'Confirmar Registro'}
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
          <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Cabeçalho Fixo */}
            <div className="p-4 border-b shrink-0 flex items-center justify-between bg-white text-blue-600">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                <h2 className="text-lg font-semibold text-gray-800">Editar Encomenda</h2>
              </div>
              <button 
                onClick={() => { setEditModal(false); setEditTarget(null); }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Unidade</p>
                  <p className="text-sm font-bold text-gray-800">
                    {editTarget.unit?.block ? `${editTarget.unit.block} - ` : ''}{editTarget.unit?.identifier}
                  </p>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-4 bg-gray-50/50 border-gray-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" /> Dados da Entrega
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Transportadora</label>
                    <Combobox
                      value={editForm.carrier}
                      onChange={v => setEditForm({ ...editForm, carrier: v })}
                      suggestions={carrierSuggestions}
                      placeholder="Ex: Correios..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Placa do Veículo</label>
                    <input 
                      value={editForm.vehiclePlate} 
                      onChange={(e) => setEditForm({ ...editForm, vehiclePlate: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="ABC-1234" maxLength={8} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Código de Rastreio / NF</label>
                    <input 
                      value={editForm.trackingCode} 
                      onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Local de Armazenamento</label>
                    <Combobox
                      value={editForm.storageLocation}
                      onChange={v => setEditForm({ ...editForm, storageLocation: v })}
                      suggestions={storageLocationSuggestions}
                      placeholder="Prateleira A-01"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-4 bg-gray-50/50 border-gray-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Identificação do Entregador
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Nome do Entregador</label>
                    <input 
                      value={editForm.deliveryPersonName} 
                      onChange={(e) => setEditForm({ ...editForm, deliveryPersonName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Documento (CPF/RG)</label>
                    <input 
                      value={editForm.deliveryPersonDoc} 
                      onChange={(e) => setEditForm({ ...editForm, deliveryPersonDoc: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" maxLength={14} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Remetente</label>
                  <input 
                    value={editForm.senderName} 
                    onChange={(e) => setEditForm({ ...editForm, senderName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer" onClick={() => setEditForm({ ...editForm, hasPackageDamage: !editForm.hasPackageDamage })}>
                  <input 
                    type="checkbox" 
                    id="editHasDamage" 
                    checked={editForm.hasPackageDamage}
                    onChange={(e) => setEditForm({ ...editForm, hasPackageDamage: e.target.checked })}
                    className="h-4 w-4 accent-orange-500 cursor-pointer rounded"
                    onClick={(e) => e.stopPropagation()} 
                  />
                  <label htmlFor="editHasDamage" className="text-sm cursor-pointer flex flex-col">
                    <span className="font-bold text-orange-700 flex items-center gap-1 text-xs uppercase">
                      <AlertTriangle className="w-3.5 h-3.5" /> Embalagem com Avaria
                    </span>
                    <span className="text-[10px] text-orange-600 leading-tight">Marque se houver danos visíveis</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="p-4 border-t shrink-0 flex gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTarget(null);
                }}
                className="flex-1 px-4 py-2 border bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate({ ...editForm, id: editTarget.id })}
                disabled={updateMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
              >
                {updateMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
