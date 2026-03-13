import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Image, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const CATEGORIES = ['areas-comuns', 'eventos', 'obras', 'outro'] as const;
const CAT_LABEL: Record<string, string> = {
  'areas-comuns': 'Áreas Comuns', eventos: 'Eventos', obras: 'Obras', outro: 'Outro',
};
const CAT_COLOR: Record<string, string> = {
  'areas-comuns': 'bg-blue-100 text-blue-700',
  eventos: 'bg-purple-100 text-purple-700',
  obras: 'bg-orange-100 text-orange-700',
  outro: 'bg-gray-100 text-gray-600',
};

interface Photo {
  id: string;
  title: string;
  description?: string;
  category: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: string;
}

function PhotoThumbnail({ condominiumId, photo, onClick }: {
  condominiumId: string; photo: Photo; onClick: () => void;
}) {
  const { data: blobUrl } = useQuery({
    queryKey: ['photo-file', photo.id],
    queryFn: async () => {
      const res = await api.get(`/gallery/${condominiumId}/${photo.id}/file`, { responseType: 'blob' });
      return URL.createObjectURL(res.data);
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  return (
    <button
      onClick={onClick}
      className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
    >
      {blobUrl
        ? <img src={blobUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-gray-300 animate-pulse" /></div>
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <p className="text-white text-xs font-medium truncate">{photo.title}</p>
      </div>
    </button>
  );
}

function LightBox({ photos, condominiumId, index, onClose, onNavigate, isMgmt, onDelete }: {
  photos: Photo[]; condominiumId: string; index: number; onClose: () => void;
  onNavigate: (i: number) => void; isMgmt: boolean; onDelete: (id: string) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate(Math.min(index + 1, photos.length - 1));
      if (e.key === 'ArrowLeft') onNavigate(Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, photos.length]);

  const { data: blobUrl } = useQuery({
    queryKey: ['photo-file', photo.id],
    queryFn: async () => {
      const res = await api.get(`/gallery/${condominiumId}/${photo.id}/file`, { responseType: 'blob' });
      return URL.createObjectURL(res.data);
    },
    staleTime: Infinity,
  });

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2"><X className="w-6 h-6" /></button>

      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {blobUrl
          ? <img src={blobUrl} alt={photo.title} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
          : <div className="w-64 h-64 flex items-center justify-center"><Image className="w-12 h-12 text-white/30 animate-pulse" /></div>
        }
        <div className="flex items-start justify-between gap-4 w-full px-2">
          <div>
            <h3 className="text-white font-semibold">{photo.title}</h3>
            {photo.description && <p className="text-white/60 text-sm mt-0.5">{photo.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[photo.category]}`}>{CAT_LABEL[photo.category]}</span>
              <span className="text-white/40 text-xs">{new Date(photo.createdAt).toLocaleDateString('pt-BR')}</span>
              <span className="text-white/40 text-xs">{(photo.fileSize / 1024).toFixed(0)} KB</span>
            </div>
          </div>
          {isMgmt && (
            <button onClick={() => onDelete(photo.id)}
              className="text-red-400 hover:text-red-300 p-2 bg-white/10 rounded-lg shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-white/30 text-xs">{index + 1} / {photos.length}</p>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const condominiumId = selectedCondominiumId;
  const qc = useQueryClient();
  const isMgmt = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const [catFilter, setCatFilter] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', category: 'outro' as string });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['gallery', condominiumId, catFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (catFilter) p.set('category', catFilter);
      const res = await api.get(`/gallery/${condominiumId}?${p}`);
      return res.data.data.photos;
    },
    enabled: !!condominiumId,
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file || !condominiumId) throw new Error('Arquivo obrigatório');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', uploadForm.title);
      fd.append('category', uploadForm.category);
      if (uploadForm.description) fd.append('description', uploadForm.description);
      await api.post(`/gallery/${condominiumId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] });
      setShowUpload(false);
      setFile(null);
      setUploadForm({ title: '', description: '', category: 'outro' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/gallery/${condominiumId}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gallery'] });
      // also remove from React Query cache
      qc.removeQueries({ queryKey: ['photo-file'] });
      setLightboxIdx(null);
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      if (!uploadForm.title) setUploadForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galeria de Fotos</h1>
          <p className="text-sm text-gray-500 mt-1">Álbum de fotos das áreas comuns, eventos e obras</p>
        </div>
        {isMgmt && (
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Adicionar Foto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[['', 'Todas'], ...CATEGORIES.map((c) => [c, CAT_LABEL[c]])].map(([val, label]) => (
          <button key={val} onClick={() => setCatFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catFilter === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Adicionar Foto</h2>
            <div className="space-y-3">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('photo-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
              >
                <input id="photo-input" type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      if (!uploadForm.title) setUploadForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }));
                    }
                  }} />
                {file
                  ? <p className="text-sm text-green-700 font-medium">📷 {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
                  : <><Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" /><p className="text-sm text-gray-500">Arraste uma imagem ou clique para selecionar</p><p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — máx 10MB</p></>
                }
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Piscina reformada" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={uploadForm.category} onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                  <input value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowUpload(false); setFile(null); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => uploadMut.mutate()} disabled={uploadMut.isPending || !file || !uploadForm.title}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {uploadMut.isPending ? 'Enviando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <LightBox
          photos={photos}
          condominiumId={condominiumId!}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={setLightboxIdx}
          isMgmt={isMgmt}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Carregando galeria...</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Image className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhuma foto ainda.</p>
          {isMgmt && <p className="text-sm mt-1">Clique em "Adicionar Foto" para começar.</p>}
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
            <span>{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
            {CATEGORIES.filter((c) => photos.some((p) => p.category === c)).map((c) => (
              <span key={c} className={`px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[c]}`}>
                {CAT_LABEL[c]}: {photos.filter((p) => p.category === c).length}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="relative">
                <PhotoThumbnail
                  condominiumId={condominiumId!}
                  photo={photo}
                  onClick={() => setLightboxIdx(idx)}
                />
                <span className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium pointer-events-none ${CAT_COLOR[photo.category]}`}>
                  {CAT_LABEL[photo.category]}
                </span>
                {isMgmt && (
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta foto?')) deleteMut.mutate(photo.id); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
