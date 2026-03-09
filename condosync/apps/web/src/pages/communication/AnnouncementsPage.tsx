import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Megaphone, Plus, Loader2, Pin } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function AnnouncementsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isPinned: false, isUrgent: false });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/communication/announcements/${selectedCondominiumId}`); return res.data.data.announcements; },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/communication/announcements', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setShowModal(false); setForm({ title: '', content: '', isPinned: false, isUrgent: false }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/communication/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avisos</h1>
          <p className="text-muted-foreground">Comunicados e informativos do condomínio</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Aviso
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : ((announcements || []) as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border"><Megaphone className="w-10 h-10" /><p>Nenhum aviso publicado</p></div>
      ) : (
        <div className="grid gap-3">
          {((announcements || []) as any[]).map((a: any) => (
            <div key={a.id} className={`bg-white rounded-xl border p-5 ${a.isUrgent ? 'border-l-4 border-l-red-500' : a.isPinned ? 'border-l-4 border-l-blue-500' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.isPinned && <span className="flex items-center gap-0.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full"><Pin className="w-3 h-3" /> Fixado</span>}
                    {a.isUrgent && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Urgente</span>}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{a.author?.name} · {formatDateTime(a.createdAt)}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteMutation.mutate(a.id)} className="text-xs text-red-600 hover:underline shrink-0">Remover</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Aviso</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Conteúdo *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="rounded" /> Fixar no topo</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isUrgent} onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })} className="rounded" /> Urgente</label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.content || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Publicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
