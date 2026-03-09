import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Building2, Plus, Search, Loader2 } from 'lucide-react';

const statusLabels: Record<string, { label: string; className: string }> = {
  OCCUPIED: { label: 'Ocupada', className: 'bg-green-100 text-green-700' },
  VACANT: { label: 'Vaga', className: 'bg-gray-100 text-gray-600' },
  UNDER_RENOVATION: { label: 'Em Reforma', className: 'bg-yellow-100 text-yellow-700' },
  BLOCKED: { label: 'Bloqueada', className: 'bg-red-100 text-red-700' },
};

export function UnitsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ identifier: '', block: '', floor: '', fraction: '', type: '' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: units, isLoading } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units;
    },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/units', { ...d, condominiumId: selectedCondominiumId, fraction: d.fraction ? parseFloat(d.fraction) : undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['units'] }); setShowModal(false); setForm({ identifier: '', block: '', floor: '', fraction: '', type: '' }); },
  });

  const filtered = ((units || []) as any[]).filter((u: any) =>
    ((u.identifier ?? '').toLowerCase().includes(search.toLowerCase()) || (u.block ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter ? u.status === statusFilter : true)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unidades</h1>
          <p className="text-muted-foreground">Mapa e gerenciamento de unidades</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Unidade
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por identificador ou bloco..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <Building2 className="w-10 h-10" />
          <p>Nenhuma unidade encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((u: any) => {
            const st = statusLabels[u.status] || statusLabels.VACANT;
            return (
              <div key={u.id} className="bg-white border rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                <div className="text-lg font-bold">{u.identifier}</div>
                {u.block && <div className="text-xs text-muted-foreground">Bloco {u.block}</div>}
                {u.floor && <div className="text-xs text-muted-foreground">{u.floor}º andar</div>}
                <div className={`mt-2 text-xs px-2 py-0.5 rounded-full font-medium inline-block ${st.className}`}>{st.label}</div>
                {u.resident && (
                  <div className="mt-1 text-xs text-gray-500 truncate">{u.resident.name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nova Unidade</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['Identificador *', 'identifier'], ['Bloco', 'block'], ['Andar', 'floor'], ['Fração ideal (%)', 'fraction'], ['Tipo', 'type']].map(([label, key]) => (
                <div key={key} className={`space-y-1 ${key === 'identifier' ? 'col-span-2' : ''}`}>
                  <label className="text-sm font-medium">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.identifier || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
