import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: { name: string };
  category?: string;
};

export default function Avisos() {
  const { selectedCondominiumId } = useAuthStore();
  const [selected, setSelected] = useState<Announcement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/communication/announcements/${selectedCondominiumId}?limit=50`);
      return res.data.data as Announcement[];
    },
    enabled: !!selectedCondominiumId,
  });

  const announcements = data ?? [];

  if (selected) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-primary-600 font-medium flex items-center gap-1"
        >
          ← Voltar
        </button>
        <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {selected.author?.name && <span>{selected.author.name}</span>}
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(selected.createdAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {selected.content}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
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
          className="btn-press w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex items-start gap-3"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 line-clamp-1">{a.title}</p>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{a.content}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
        </button>
      ))}
    </div>
  );
}
