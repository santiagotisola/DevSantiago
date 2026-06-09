import { useQuery } from '@tanstack/react-query';
import { FileText, Download, FolderOpen, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Document = {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileSize?: number;
  createdAt: string;
  uploadedBy?: { name: string };
};

const CATEGORY_COLORS: Record<string, string> = {
  REGULAMENTO: 'bg-blue-100 text-blue-700',
  ATA: 'bg-purple-100 text-purple-700',
  CONVENCAO: 'bg-green-100 text-green-700',
  FINANCEIRO: 'bg-amber-100 text-amber-700',
  CONTRATO: 'bg-red-100 text-red-700',
  OUTROS: 'bg-gray-100 text-gray-600',
};

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentosMobilePage() {
  const { selectedCondominiumId } = useAuthStore();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/documents/condominium/${selectedCondominiumId}`);
      return (res.data.data?.documents ?? res.data.data ?? []) as Document[];
    },
    enabled: !!selectedCondominiumId,
  });

  const documents = data ?? [];
  const categories = [...new Set(documents.map((d) => d.category))];

  const filtered = documents.filter((d) => {
    const matchText = !filter || d.title.toLowerCase().includes(filter.toLowerCase());
    const matchCategory = !categoryFilter || d.category === categoryFilter;
    return matchText && matchCategory;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar documento..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-700/60 border border-slate-600 rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('')}
            className={['text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap',
              !categoryFilter ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600'
            ].join(' ')}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
              className={['text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap',
                cat === categoryFilter ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 border border-slate-600'
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum documento encontrado</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((doc) => {
          const catColor = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.OUTROS;
          return (
            <div key={doc.id} className="bg-slate-700/60 rounded-2xl border border-slate-600 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={['text-xs px-2 py-0.5 rounded-full font-medium', catColor].join(' ')}>
                      {doc.category}
                    </span>
                    {doc.fileSize && (
                      <span className="text-xs text-slate-400">{formatSize(doc.fileSize)}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    {doc.uploadedBy && ` · ${doc.uploadedBy.name}`}
                  </p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Baixar documento"
                  className="btn-press w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"
                >
                  <Download size={16} className="text-white" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
