import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import {
  Plus, Search, Loader2, X, Camera, MapPin,
  Video, VideoOff, Circle, Pencil, Trash2,
  Maximize2, Wifi, WifiOff, Eye
} from 'lucide-react';

interface CameraItem {
  id: string;
  name: string;
  location: string;
  brand?: string;
  model?: string;
  streamUrl: string;
  embedUrl?: string;
  snapshotUrl?: string;
  isActive: boolean;
  isRecording: boolean;
  resolution?: string;
  notes?: string;
  createdAt: string;
}

const emptyForm = {
  name: '',
  location: '',
  brand: '',
  model: '',
  streamUrl: '',
  embedUrl: '',
  snapshotUrl: '',
  resolution: '',
  notes: '',
};

export default function CamerasPage() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CameraItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<CameraItem | null>(null);
  const [viewTarget, setViewTarget] = useState<CameraItem | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN', 'DOORMAN'].includes(user?.role || '');

  const { data: cameras, isLoading } = useQuery({
    queryKey: ['cameras', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/cameras/condominium/${condominiumId}`);
      return res.data.data.cameras as CameraItem[];
    },
    enabled: !!condominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/cameras', { ...data, condominiumId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/cameras/${editTarget!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cameras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/cameras/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
    setForm({ ...emptyForm });
  }

  function openEdit(cam: CameraItem) {
    setEditTarget(cam);
    setForm({
      name: cam.name,
      location: cam.location,
      brand: cam.brand || '',
      model: cam.model || '',
      streamUrl: cam.streamUrl,
      embedUrl: cam.embedUrl || '',
      snapshotUrl: cam.snapshotUrl || '',
      resolution: cam.resolution || '',
      notes: cam.notes || '',
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      embedUrl: form.embedUrl || undefined,
      snapshotUrl: form.snapshotUrl || undefined,
    };
    if (editTarget) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const locations = [...new Set((cameras || []).map(c => c.location))].sort();

  const filtered = (cameras || []).filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase());
    const matchLocation = !locationFilter || c.location === locationFilter;
    return matchSearch && matchLocation;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-7 h-7 text-blue-600" />
            Monitoramento de Câmeras
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} câmera{filtered.length !== 1 ? 's' : ''} cadastrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Câmera
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar câmera..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          title="Filtrar por localização"
          className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as localizações</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Camera className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhuma câmera encontrada</p>
          <p className="text-sm">Cadastre a primeira câmera do condomínio</p>
        </div>
      )}

      {/* Camera Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(cam => (
            <div
              key={cam.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Thumbnail / Placeholder */}
              <div
                className="relative h-44 bg-gray-900 flex items-center justify-center cursor-pointer group"
                onClick={() => setViewTarget(cam)}
              >
                {cam.snapshotUrl ? (
                  <img
                    src={cam.snapshotUrl}
                    alt={cam.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <Camera className="w-16 h-16 text-gray-600 group-hover:text-gray-400 transition-colors" />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-10 h-10 text-white" />
                </div>
                {/* Status badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    cam.isActive
                      ? 'bg-green-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}>
                    {cam.isActive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {cam.isActive ? 'Online' : 'Offline'}
                  </span>
                  {cam.isRecording && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-600/90 text-white">
                      <Circle className="w-2.5 h-2.5 fill-current animate-pulse" /> REC
                    </span>
                  )}
                </div>
                {cam.resolution && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white">
                    {cam.resolution}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">{cam.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {cam.location}
                </div>
                {(cam.brand || cam.model) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {[cam.brand, cam.model].filter(Boolean).join(' — ')}
                  </p>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setViewTarget(cam)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Video className="w-3.5 h-3.5" /> Assistir
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(cam.id)}
                      className={`flex items-center gap-1 text-xs ${
                        cam.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {cam.isActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                      {cam.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => openEdit(cam)}
                      title="Editar câmera"
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cam)}
                      title="Remover câmera"
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal Create/Edit ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">{editTarget ? 'Editar Câmera' : 'Nova Câmera'}</h2>
              <button onClick={closeModal} title="Fechar" className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Câmera Entrada Principal"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localização *</label>
                  <input
                    required
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: Portaria"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolução</label>
                  <input
                    value={form.resolution}
                    onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
                    placeholder="Ex: 1080p"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Ex: Intelbras"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    value={form.model}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    placeholder="Ex: VIP 1230"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Stream (HLS/RTSP) *</label>
                <input
                  required
                  value={form.streamUrl}
                  onChange={e => setForm(f => ({ ...f, streamUrl: e.target.value }))}
                  placeholder="https://stream.exemplo.com/camera1/index.m3u8"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de Embed (iframe)</label>
                <input
                  value={form.embedUrl}
                  onChange={e => setForm(f => ({ ...f, embedUrl: e.target.value }))}
                  placeholder="https://cloud.intelbras.com/embed/cam123"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de Snapshot (thumbnail)</label>
                <input
                  value={form.snapshotUrl}
                  onChange={e => setForm(f => ({ ...f, snapshotUrl: e.target.value }))}
                  placeholder="https://camera.exemplo.com/snapshot.jpg"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Observações adicionais..."
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Delete ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Remover câmera?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Tem certeza que deseja remover <strong>{deleteTarget.name}</strong>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Viewer ─── */}
      {viewTarget && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${fullscreen ? '' : 'bg-black/60'}`}>
          <div className={`bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col ${
            fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl mx-4 max-h-[90vh]'
          }`}>
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 text-white">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-semibold">{viewTarget.name}</h3>
                  <p className="text-xs text-gray-400">{viewTarget.location}</p>
                </div>
                {viewTarget.isRecording && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                    <Circle className="w-2 h-2 fill-current animate-pulse" /> REC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullscreen(f => !f)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewTarget(null); setFullscreen(false); }}
                  title="Fechar"
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stream */}
            <div className="flex-1 flex items-center justify-center bg-black min-h-[300px]">
              {viewTarget.embedUrl ? (
                <iframe
                  src={viewTarget.embedUrl}
                  className="w-full h-full min-h-[400px]"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={viewTarget.name}
                />
              ) : (
                <video
                  src={viewTarget.streamUrl}
                  controls
                  autoPlay
                  muted
                  className="w-full h-full max-h-[70vh] object-contain"
                >
                  Seu navegador não suporta a reprodução deste stream.
                </video>
              )}
            </div>

            {/* Viewer Footer */}
            <div className="px-4 py-2 bg-gray-800 text-gray-400 text-xs flex items-center gap-4">
              {viewTarget.brand && <span>Marca: {viewTarget.brand}</span>}
              {viewTarget.model && <span>Modelo: {viewTarget.model}</span>}
              {viewTarget.resolution && <span>Resolução: {viewTarget.resolution}</span>}
              <span className={viewTarget.isActive ? 'text-green-400' : 'text-red-400'}>
                {viewTarget.isActive ? '● Online' : '● Offline'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
