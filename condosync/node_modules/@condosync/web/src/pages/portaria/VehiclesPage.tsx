import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Car, Plus, Search, LogOut, Loader2, Pencil, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  TRUCK: 'Caminhão',
  BICYCLE: 'Bicicleta',
  OTHER: 'Outro',
};

// Mapeamento para a Tabela FIPE (apenas CAR, MOTORCYCLE, TRUCK têm suporte)
const FIPE_TIPO: Record<string, string> = {
  CAR: 'carros',
  MOTORCYCLE: 'motos',
  TRUCK: 'caminhoes',
};

const CORES = [
  'Amarelo', 'Azul', 'Bege', 'Branco', 'Cinza',
  'Dourado', 'Laranja', 'Marrom', 'Preto', 'Prata',
  'Rosa', 'Roxo', 'Verde', 'Vermelho', 'Vinho', 'Outro',
];

const emptyLogForm = { plate: '', unitId: '', isResident: false, notes: '' };
const emptyVehicleForm = { unitId: '', plate: '', brand: '', model: '', color: '', year: '', type: 'CAR' };

export function VehiclesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'acessos' | 'cadastrados'>('acessos');
  const [search, setSearch] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyVehicleForm);
  const [editModal, setEditModal] = useState(false);

  // Estado FIPE — cadastro
  const [fipeBrandCode, setFipeBrandCode] = useState('');
  const [fipeModelCode, setFipeModelCode] = useState('');
  // Estado FIPE — edição
  const [editFipeBrandCode, setEditFipeBrandCode] = useState('');
  const [editFipeModelCode, setEditFipeModelCode] = useState('');

  const canRegister = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');
  const canManage = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  // Unidades do condomínio (para selects)
  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as { id: string; identifier: string; block?: string }[];
    },
    enabled: !!selectedCondominiumId && (showLogModal || showVehicleModal || editModal),
  });

  // Logs de acesso
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['vehicle-logs', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/access-logs/${selectedCondominiumId}`);
      return res.data.data.logs as any[];
    },
    enabled: !!selectedCondominiumId && canRegister && tab === 'acessos',
  });

  // Veículos cadastrados — busca por unidades do condomínio
  const { data: allUnits } = useQuery({
    queryKey: ['units-full', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as { id: string; identifier: string; block?: string }[];
    },
    enabled: !!selectedCondominiumId && tab === 'cadastrados',
  });

  const { data: vehiclesList, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['vehicles', selectedCondominiumId],
    queryFn: async () => {
      if (!allUnits || allUnits.length === 0) return [];
      const results = await Promise.all(
        allUnits.map((u) =>
          api.get(`/vehicles/unit/${u.id}`).then((r) =>
            (r.data.data.vehicles as any[]).map((v) => ({ ...v, unit: u }))
          ).catch(() => [])
        )
      );
      return results.flat();
    },
    enabled: !!selectedCondominiumId && tab === 'cadastrados' && !!allUnits,
  });

  // Mutations — logs
  const entryMutation = useMutation({
    mutationFn: (d: typeof logForm) => api.post('/vehicles/access-logs', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-logs'] }); setShowLogModal(false); setLogForm(emptyLogForm); },
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/vehicles/access-logs/${id}/exit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-logs'] }),
  });

  // Mutations — veículos
  const createVehicleMutation = useMutation({
    mutationFn: (d: typeof vehicleForm) =>
      api.post('/vehicles', { ...d, year: d.year ? Number(d.year) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowVehicleModal(false);
      setVehicleForm(emptyVehicleForm);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & typeof emptyVehicleForm) =>
      api.put(`/vehicles/${id}`, { ...d, year: d.year ? Number(d.year) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  // ─── Tabela FIPE — Cadastro ──────────────────────────────────────────────────
  const fipeTipo = FIPE_TIPO[vehicleForm.type] || '';

  const { data: fipeBrands, isFetching: loadingBrands } = useQuery({
    queryKey: ['fipe-brands', fipeTipo],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${fipeTipo}/marcas`);
      return (await res.json()) as { codigo: string; nome: string }[];
    },
    enabled: !!fipeTipo && showVehicleModal,
    staleTime: 60 * 60 * 1000,
  });

  const { data: fipeModels, isFetching: loadingModels } = useQuery({
    queryKey: ['fipe-models', fipeTipo, fipeBrandCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${fipeTipo}/marcas/${fipeBrandCode}/modelos`);
      const d = await res.json();
      return (d.modelos || []) as { codigo: number; nome: string }[];
    },
    enabled: !!fipeTipo && !!fipeBrandCode && showVehicleModal,
    staleTime: 60 * 60 * 1000,
  });

  const { data: fipeYears, isFetching: loadingYears } = useQuery({
    queryKey: ['fipe-years', fipeTipo, fipeBrandCode, fipeModelCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${fipeTipo}/marcas/${fipeBrandCode}/modelos/${fipeModelCode}/anos`);
      return (await res.json()) as { codigo: string; nome: string }[];
    },
    enabled: !!fipeTipo && !!fipeBrandCode && !!fipeModelCode && showVehicleModal,
    staleTime: 60 * 60 * 1000,
  });

  // ─── Tabela FIPE — Edição ────────────────────────────────────────────────────
  const editFipeTipo = FIPE_TIPO[editForm.type] || '';

  const { data: editFipeBrands, isFetching: loadingEditBrands } = useQuery({
    queryKey: ['fipe-brands-edit', editFipeTipo],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${editFipeTipo}/marcas`);
      return (await res.json()) as { codigo: string; nome: string }[];
    },
    enabled: !!editFipeTipo && editModal,
    staleTime: 60 * 60 * 1000,
  });

  const { data: editFipeModels, isFetching: loadingEditModels } = useQuery({
    queryKey: ['fipe-models-edit', editFipeTipo, editFipeBrandCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${editFipeTipo}/marcas/${editFipeBrandCode}/modelos`);
      const d = await res.json();
      return (d.modelos || []) as { codigo: number; nome: string }[];
    },
    enabled: !!editFipeTipo && !!editFipeBrandCode && editModal,
    staleTime: 60 * 60 * 1000,
  });

  const { data: editFipeYears, isFetching: loadingEditYears } = useQuery({
    queryKey: ['fipe-years-edit', editFipeTipo, editFipeBrandCode, editFipeModelCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${editFipeTipo}/marcas/${editFipeBrandCode}/modelos/${editFipeModelCode}/anos`);
      return (await res.json()) as { codigo: string; nome: string }[];
    },
    enabled: !!editFipeTipo && !!editFipeBrandCode && !!editFipeModelCode && editModal,
    staleTime: 60 * 60 * 1000,
  });

  const filteredLogs = ((logsData || []) as any[]).filter((l) =>
    (l.plate ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (l.vehicle?.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredVehicles = ((vehiclesList || []) as any[]).filter((v) =>
    (v.plate ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.model ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">Controle de acesso e veículos cadastrados</p>
        </div>
        <div className="flex gap-2">
          {canRegister && tab === 'acessos' && (
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Registrar Acesso
            </button>
          )}
          {canManage && tab === 'cadastrados' && (
            <button
              onClick={() => setShowVehicleModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Veículo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['acessos', 'cadastrados'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'acessos' ? 'Controle de Acesso' : 'Veículos Cadastrados'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'acessos' ? 'Buscar por placa ou unidade...' : 'Buscar por placa, marca, modelo ou unidade...'}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Conteúdo — Acessos */}
      {tab === 'acessos' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoadingLogs ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Car className="w-10 h-10" />
              <p>Nenhum acesso registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Entrada</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Saída</th>
                    {canRegister && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold">{l.plate}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {l.vehicle?.unit ? `${l.vehicle.unit.block ? l.vehicle.unit.block + ' - ' : ''}${l.vehicle.unit.identifier}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.isResident ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {l.isResident ? 'Morador' : 'Visitante'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(l.entryAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.exitAt ? formatDateTime(l.exitAt) : <span className="text-green-600 font-medium">Dentro</span>}</td>
                      {canRegister && (
                        <td className="px-4 py-3 text-right">
                          {!l.exitAt && (
                            <button
                              onClick={() => exitMutation.mutate(l.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 ml-auto"
                            >
                              <LogOut className="w-3 h-3" />
                              Registrar Saída
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
      )}

      {/* Conteúdo — Veículos Cadastrados */}
      {tab === 'cadastrados' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoadingVehicles ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Car className="w-10 h-10" />
              <p>Nenhum veículo cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Veículo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                    {canManage && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredVehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold">{v.plate}</td>
                      <td className="px-4 py-3">{v.brand} {v.model}{v.year ? ` (${v.year})` : ''}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.color}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {VEHICLE_TYPE_LABELS[v.type] || v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.unit?.block ? `${v.unit.block} - ` : ''}{v.unit?.identifier || '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditTarget(v); setEditForm({ unitId: v.unitId, plate: v.plate, brand: v.brand, model: v.model, color: v.color, year: v.year?.toString() || '', type: v.type }); setEditModal(true); }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => { if (confirm('Remover este veículo?')) deleteVehicleMutation.mutate(v.id); }}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remover
                            </button>
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
      )}

      {/* Modal — Registrar Acesso */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Acesso de Veículo</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Placa *</label>
                <input
                  value={logForm.plate}
                  onChange={(e) => setLogForm({ ...logForm, plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade (opcional)</label>
                <select
                  value={logForm.unitId}
                  onChange={(e) => setLogForm({ ...logForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Não identificada</option>
                  {(units || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `${u.block} - ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={logForm.isResident}
                  onChange={(e) => setLogForm({ ...logForm, isResident: e.target.checked })}
                  className="rounded"
                />
                Veículo de morador
              </label>
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <input
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => entryMutation.mutate(logForm)}
                disabled={!logForm.plate || entryMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {entryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Registrar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Cadastrar Veículo */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Cadastrar Veículo</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select
                  value={vehicleForm.unitId}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {(units || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `${u.block} - ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
              {/* Tipo primeiro para habilitar o FIPE cascade */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={vehicleForm.type}
                  onChange={(e) => {
                    setVehicleForm({ ...vehicleForm, type: e.target.value, brand: '', model: '', year: '' });
                    setFipeBrandCode('');
                    setFipeModelCode('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {/* Marca — FIPE select ou texto livre */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Marca *</label>
                {fipeTipo ? (
                  <select
                    value={fipeBrandCode}
                    onChange={(e) => {
                      const b = (fipeBrands || []).find((x) => x.codigo === e.target.value);
                      setFipeBrandCode(e.target.value);
                      setFipeModelCode('');
                      setVehicleForm({ ...vehicleForm, brand: b?.nome || '', model: '', year: '' });
                    }}
                    disabled={loadingBrands}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">{loadingBrands ? 'Carregando marcas...' : 'Selecione a marca...'}</option>
                    {(fipeBrands || []).map((b) => (
                      <option key={b.codigo} value={b.codigo}>{b.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Marca do veículo"
                  />
                )}
              </div>
              {/* Modelo — FIPE cascading */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Modelo *</label>
                {fipeTipo ? (
                  <select
                    value={fipeModelCode}
                    onChange={(e) => {
                      const m = (fipeModels || []).find((x) => x.codigo.toString() === e.target.value);
                      setFipeModelCode(e.target.value);
                      setVehicleForm({ ...vehicleForm, model: m?.nome || '', year: '' });
                    }}
                    disabled={!fipeBrandCode || loadingModels}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">
                      {!fipeBrandCode ? 'Selecione a marca primeiro' : loadingModels ? 'Carregando modelos...' : 'Selecione o modelo...'}
                    </option>
                    {(fipeModels || []).map((m) => (
                      <option key={m.codigo} value={m.codigo.toString()}>{m.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Modelo do veículo"
                  />
                )}
              </div>
              {/* Ano — FIPE cascading */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Ano</label>
                {fipeTipo ? (
                  <select
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    disabled={!fipeModelCode || loadingYears}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">
                      {!fipeModelCode ? 'Selecione o modelo primeiro' : loadingYears ? 'Carregando anos...' : 'Selecione o ano...'}
                    </option>
                    {(fipeYears || []).map((y) => (
                      <option key={y.codigo} value={y.nome.split(' ')[0]}>{y.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2023"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                  />
                )}
              </div>
              {/* Cor — select predefinido */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Cor *</label>
                <select
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a cor...</option>
                  {CORES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Placa */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Placa *</label>
                <input
                  value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowVehicleModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => createVehicleMutation.mutate(vehicleForm)}
                disabled={createVehicleMutation.isPending || !vehicleForm.unitId || !vehicleForm.plate || !vehicleForm.brand || !vehicleForm.model || !vehicleForm.color}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {createVehicleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Editar Veículo */}
      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Editar Veículo</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select
                  value={editForm.unitId}
                  onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {(units || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `${u.block} - ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={editForm.type}
                  onChange={(e) => {
                    setEditForm({ ...editForm, type: e.target.value, brand: '', model: '', year: '' });
                    setEditFipeBrandCode('');
                    setEditFipeModelCode('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Marca *</label>
                {editFipeTipo ? (
                  <select
                    value={editFipeBrandCode}
                    onChange={(e) => {
                      const b = (editFipeBrands || []).find((x) => x.codigo === e.target.value);
                      setEditFipeBrandCode(e.target.value);
                      setEditFipeModelCode('');
                      setEditForm({ ...editForm, brand: b?.nome || '', model: '', year: '' });
                    }}
                    disabled={loadingEditBrands}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">{loadingEditBrands ? 'Carregando marcas...' : editForm.brand || 'Selecione a marca...'}</option>
                    {(editFipeBrands || []).map((b) => (
                      <option key={b.codigo} value={b.codigo}>{b.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Modelo *</label>
                {editFipeTipo ? (
                  <select
                    value={editFipeModelCode}
                    onChange={(e) => {
                      const m = (editFipeModels || []).find((x) => x.codigo.toString() === e.target.value);
                      setEditFipeModelCode(e.target.value);
                      setEditForm({ ...editForm, model: m?.nome || '', year: '' });
                    }}
                    disabled={!editFipeBrandCode || loadingEditModels}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">{!editFipeBrandCode ? 'Selecione a marca primeiro' : loadingEditModels ? 'Carregando...' : editForm.model || 'Selecione o modelo...'}</option>
                    {(editFipeModels || []).map((m) => (
                      <option key={m.codigo} value={m.codigo.toString()}>{m.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ano</label>
                {editFipeTipo ? (
                  <select
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    disabled={!editFipeModelCode || loadingEditYears}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">{!editFipeModelCode ? 'Selecione o modelo primeiro' : loadingEditYears ? 'Carregando...' : editForm.year || 'Selecione o ano...'}</option>
                    {(editFipeYears || []).map((y) => (
                      <option key={y.codigo} value={y.nome.split(' ')[0]}>{y.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" min={1980} max={new Date().getFullYear() + 1} />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cor *</label>
                <select
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{editForm.color || 'Selecione a cor...'}</option>
                  {CORES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Placa *</label>
                <input
                  value={editForm.plate}
                  onChange={(e) => setEditForm({ ...editForm, plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditModal(false); setEditTarget(null); }} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => updateVehicleMutation.mutate({ ...editForm, id: editTarget.id })}
                disabled={updateVehicleMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateVehicleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
