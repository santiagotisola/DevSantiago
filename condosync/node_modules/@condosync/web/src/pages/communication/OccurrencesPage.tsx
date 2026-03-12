import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { AlertCircle, Plus, Loader2, Search } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

const occurrenceStatusLabels: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Aberta', className: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'Em Análise', className: 'bg-yellow-100 text-yellow-700' },
  RESOLVED: { label: 'Resolvida', className: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Encerrada', className: 'bg-gray-100 text-gray-600' },
};

export function OccurrencesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: occurrences, isLoading } = useQuery({
    queryKey: ['occurrences', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/communication/occurrences/${selectedCondominiumId}`); return res.data.data.occurrences; },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/communication/occurrences', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['occurrences'] }); setShowModal(false); setForm({ title: '', description: '', category: '' }); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/communication/occurrences/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
  });

  const filtered = ((occurrences || []) as any[]).filter((o: any) =>
    o.title.toLowerCase().includes(search.toLowerCase()) || o.category?.toLowerCase().includes(search.toLowerCase())
  );

  const nextStatus: Record<string, string> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED', RESOLVED: 'CLOSED' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-muted-foreground">Registro e acompanhamento de ocorrências</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar Ocorrência
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ocorrências..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border"><AlertCircle className="w-10 h-10" /><p>Nenhuma ocorrência encontrada</p></div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o: any) => {
            const st = occurrenceStatusLabels[o.status] || occurrenceStatusLabels.OPEN;
            return (
              <div key={o.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.className}`}>{st.label}</span>
                      {o.category && <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{o.category}</span>}
                    </div>
                    <h3 className="font-medium text-sm">{o.title}</h3>
                    {o.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{o.author?.name} · {formatDateTime(o.createdAt)}</p>
                  </div>
                  {isAdmin && nextStatus[o.status] && (
                    <button onClick={() => updateStatusMutation.mutate({ id: o.id, status: nextStatus[o.status] })} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 shrink-0">Avançar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Ocorrência</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoria</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Barulho, Segurança..." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.description || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
