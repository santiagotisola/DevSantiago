import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Wrench, Plus, Search, Loader2, ChevronDown } from 'lucide-react';
import { formatDate } from '../../lib/utils';

const statusLabels: Record<string, { label: string; className: string; next?: string }> = {
  OPEN: { label: 'Aberto', className: 'bg-yellow-100 text-yellow-700', next: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700', next: 'DONE' },
  DONE: { label: 'Concluído', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500' },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Baixa', className: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Média', className: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
};

export function MaintenancePage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: '' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['maintenance', selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const url = `/maintenance/condominium/${selectedCondominiumId}${statusFilter ? `?status=${statusFilter}` : ''}`;
      const res = await api.get(url);
      return res.data.data.orders;
    },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/maintenance', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance'] }); setShowModal(false); setForm({ title: '', description: '', priority: 'MEDIUM', category: '' }); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/maintenance/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
  });

  const filtered = ((orders || []) as any[]).filter((o: any) =>
    (o.title ?? '').toLowerCase().includes(search.toLowerCase()) || (o.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-muted-foreground">Ordens de serviço e manutenções</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova O.S.
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ordens..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border"><Wrench className="w-10 h-10" /><p>Nenhuma ordem encontrada</p></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o: any) => {
            const st = statusLabels[o.status] || statusLabels.OPEN;
            const pr = priorityLabels[o.priority] || priorityLabels.MEDIUM;
            return (
              <div key={o.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium text-sm">{o.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.className}`}>{pr.label}</span>
                    </div>
                    {o.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{o.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {o.category && <span>Categoria: {o.category}</span>}
                      {o.dueDate && <span>Prazo: {formatDate(o.dueDate)}</span>}
                      {o.assignedTo && <span>Responsável: {o.assignedTo.name}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.className}`}>{st.label}</span>
                    {isAdmin && st.next && (
                      <button onClick={() => updateStatusMutation.mutate({ id: o.id, status: st.next! })} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                        Avançar Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nova Ordem de Serviço</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prioridade</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Elétrico" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
