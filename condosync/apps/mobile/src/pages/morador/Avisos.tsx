import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronRight, Pin, Megaphone, Plus, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Announcement = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;
  isPinned?: boolean;
  isOfficial?: boolean;
  author?: { name: string };
};

const ADMIN_ROLES = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];
const emptyForm = { title: '', content: '', isPinned: false, isOfficial: false };

export default function Avisos() {
  const { selectedCondominiumId, user } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/communication/announcements/${selectedCondominiumId}?limit=50`);
      return res.data.data.announcements as Announcement[];
    },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post('/communication/announcements', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      toast.success('Aviso publicado!');
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Erro ao publicar aviso'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/communication/announcements/${id}`),
    onSuccess: () => {
      toast.success('Aviso removido.');
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setSelected(null);
    },
    onError: () => toast.error('Erro ao remover aviso'),
  });

  const announcements = data ?? [];
  const date = (a: Announcement) => a.publishedAt ?? a.createdAt;

  // ── Detalhe ─────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-primary-600 font-medium flex items-center gap-1"
        >
          ← Voltar
        </button>

        <div className="flex items-start gap-2 flex-wrap">
          {selected.isPinned && (
            <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              <Pin size={11} /> Fixado
            </span>
          )}
          {selected.isOfficial && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Oficial
            </span>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {selected.author?.name && <span>{selected.author.name}</span>}
          <span>·</span>
          <span>{formatDistanceToNow(new Date(date(selected)), { addSuffix: true, locale: ptBR })}</span>
        </div>

        <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {selected.content}
        </div>

        {isAdmin && (
          <button
            onClick={() => { if (confirm('Remover este aviso?')) deleteMutation.mutate(selected.id); }}
            disabled={deleteMutation.isPending}
            className="mt-4 text-sm text-red-600 underline"
          >
            Remover aviso
          </button>
        )}
      </div>
    );
  }

  // ── Lista ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-3">
      {/* Botão novo aviso (admins) */}
      {isAdmin && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white rounded-xl py-3 text-sm font-semibold"
        >
          <Plus size={16} />
          Novo Aviso
        </button>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && announcements.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Bell size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum aviso publicado</p>
        </div>
      )}

      {announcements.map((a) => (
        <button
          key={a.id}
          onClick={() => setSelected(a)}
          className={[
            'btn-press w-full bg-white rounded-2xl border shadow-sm p-4 text-left flex items-start gap-3',
            a.isPinned ? 'border-l-4 border-l-blue-500 border-gray-100' : 'border-gray-100',
          ].join(' ')}
        >
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            {a.isPinned
              ? <Pin size={18} className="text-blue-600" />
              : <Bell size={18} className="text-purple-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <p className="font-semibold text-gray-900 line-clamp-1">{a.title}</p>
              {a.isPinned && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                  Fixado
                </span>
              )}
              {a.isOfficial && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                  Oficial
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{a.content}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(date(a)), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
        </button>
      ))}

      {/* Modal — Novo Aviso */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Megaphone size={20} className="text-primary-600" />
                <h3 className="text-base font-bold text-gray-900">Novo Aviso</h3>
              </div>
              <button
                onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }}
                className="text-gray-400"
                aria-label="Fechar modal"
              >
                <X size={22} />
              </button>
            </div>

            {/* Corpo scrollável */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título do aviso"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Conteúdo *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Escreva o comunicado..."
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="w-4 h-4 accent-primary-600"
                  />
                  Fixar no topo
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOfficial}
                    onChange={(e) => setForm((f) => ({ ...f, isOfficial: e.target.checked }))}
                    className="w-4 h-4 accent-primary-600"
                  />
                  Aviso oficial
                </label>
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="px-5 py-4 border-t shrink-0">
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
                className="w-full bg-primary-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Megaphone size={16} />
                }
                Publicar aviso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
