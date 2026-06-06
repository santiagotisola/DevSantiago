import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import {
  Plus, Search, Loader2, X, Key, MapPin,
  ArrowRightLeft, AlertTriangle, Clock, History, Pencil, Trash2
} from 'lucide-react';

type KeyStatus = 'AVAILABLE' | 'BORROWED' | 'LOST' | 'MAINTENANCE';

const statusConfig: Record<KeyStatus, { label: string; className: string; dotColor: string }> = {
  AVAILABLE: { label: 'Disponível', className: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
  BORROWED: { label: 'Emprestada', className: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500' },
  LOST: { label: 'Perdida', className: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
  MAINTENANCE: { label: 'Manutenção', className: 'bg-slate-100 text-slate-600', dotColor: 'bg-slate-400' },
};

const emptyKeyForm = {
  keyIdentifier: '',
  description: '',
  location: '',
};

const emptyBorrowForm = {
  borrowedBy: '',
  borrowedByUnit: '',
  notes: '',
};

const statusTabs = [
  { key: 'ALL', label: 'Todas' },
  { key: 'AVAILABLE', label: 'Disponíveis' },
  { key: 'BORROWED', label: 'Emprestadas' },
  { key: 'LOST', label: 'Perdidas' },
];

export default function ControleChavesPage() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [keyForm, setKeyForm] = useState({ ...emptyKeyForm });
  const [borrowTarget, setBorrowTarget] = useState<any>(null);
  const [borrowForm, setBorrowForm] = useState({ ...emptyBorrowForm });
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [lostTarget, setLostTarget] = useState<any>(null);
  const [lostNotes, setLostNotes] = useState('');
  const [historyTarget, setHistoryTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN', 'DOORMAN'].includes(user?.role || '');

  const { data: keys, isLoading } = useQuery({
    queryKey: ['key-control', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/key-control/condominium/${condominiumId}`);
      return res.data.data.keys;
    },
    enabled: !!condominiumId,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['key-logs', historyTarget?.id],
    queryFn: async () => {
      const res = await api.get(`/key-control/${historyTarget.id}/logs`);
      return res.data.data.logs;
    },
    enabled: !!historyTarget,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/key-control', { ...data, condominiumId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      closeCreateModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/key-control/${editTarget.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      closeCreateModal();
    },
  });

  const borrowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/key-control/${id}/borrow`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      setBorrowTarget(null);
      setBorrowForm({ ...emptyBorrowForm });
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/key-control/${id}/return`, { notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      setReturnTarget(null);
      setReturnNotes('');
    },
  });

  const lostMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/key-control/${id}/lost`, { notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      setLostTarget(null);
      setLostNotes('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/key-control/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-control'] });
      setDeleteTarget(null);
    },
  });

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditTarget(null);
    setKeyForm({ ...emptyKeyForm });
  };

  const openEdit = (key: any) => {
    setEditTarget(key);
    setKeyForm({
      keyIdentifier: key.keyIdentifier || '',
      description: key.description || '',
      location: key.location || '',
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
      updateMutation.mutate(keyForm);
    } else {
      createMutation.mutate(keyForm);
    }
  };

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    borrowMutation.mutate({ id: borrowTarget.id, data: borrowForm });
  };

  const filtered = (keys || []).filter((k: any) => {
    const matchesTab = activeTab === 'ALL' || k.status === activeTab;
    const matchesSearch =
      (k.keyIdentifier || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.borrowedBy || '').toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const formatDateTime = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Chaves</h1>
          <p className="text-sm text-slate-500">Gerencie chaves do condomínio, empréstimos e devoluções</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Chave
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por identificador, localização ou portador..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed p-12 text-center text-slate-400">
          <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma chave encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((k: any) => (
            <div key={k.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      k.status === 'AVAILABLE' ? 'bg-green-50 text-green-600' :
                      k.status === 'BORROWED' ? 'bg-yellow-50 text-yellow-600' :
                      k.status === 'LOST' ? 'bg-red-50 text-red-600' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{k.keyIdentifier}</h3>
                      {k.location && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {k.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[k.status as KeyStatus]?.className || 'bg-gray-100 text-gray-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[k.status as KeyStatus]?.dotColor || 'bg-gray-400'}`} />
                    {statusConfig[k.status as KeyStatus]?.label || k.status}
                  </span>
                </div>

                {k.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{k.description}</p>
                )}

                {k.status === 'BORROWED' && k.borrowedBy && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-yellow-700">Emprestada para:</p>
                    <p className="text-sm text-yellow-800 font-medium">{k.borrowedBy}</p>
                    {k.borrowedByUnit && <p className="text-xs text-yellow-600">{k.borrowedByUnit}</p>}
                    {k.borrowedAt && (
                      <p className="text-xs text-yellow-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(k.borrowedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setHistoryTarget(k)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Histórico
                </button>
                <div className="flex items-center gap-1">
                  {k.status === 'AVAILABLE' && isAdmin && (
                    <button
                      onClick={() => setBorrowTarget(k)}
                      title="Emprestar"
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}
                  {k.status === 'BORROWED' && isAdmin && (
                    <button
                      onClick={() => setReturnTarget(k)}
                      title="Devolver"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  )}
                  {(k.status === 'AVAILABLE' || k.status === 'BORROWED') && isAdmin && (
                    <button
                      onClick={() => setLostTarget(k)}
                      title="Marcar Perdida"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(k)}
                        title="Editar"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(k)}
                        title="Excluir"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar/Editar Chave */}
      {(showCreateModal || editTarget) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editTarget ? 'Editar Chave' : 'Cadastrar Nova Chave'}
              </h2>
              <button onClick={closeCreateModal} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Identificador *</label>
                <input
                  type="text"
                  value={keyForm.keyIdentifier}
                  onChange={(e) => setKeyForm({ ...keyForm, keyIdentifier: e.target.value })}
                  placeholder="Ex: Sala 01, Portão B, Playground"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={keyForm.description}
                  onChange={(e) => setKeyForm({ ...keyForm, description: e.target.value })}
                  placeholder="Descrição da chave"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={keyForm.location}
                    onChange={(e) => setKeyForm({ ...keyForm, location: e.target.value })}
                    placeholder="Onde a chave fica guardada"
                    className="w-full pl-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Emprestar */}
      {borrowTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Emprestar Chave</h2>
              <button onClick={() => { setBorrowTarget(null); setBorrowForm({ ...emptyBorrowForm }); }} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBorrowSubmit} className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-sm font-medium text-indigo-700">{borrowTarget.keyIdentifier}</p>
                {borrowTarget.location && <p className="text-xs text-indigo-500">{borrowTarget.location}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Retirado por *</label>
                <input
                  type="text"
                  value={borrowForm.borrowedBy}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrowedBy: e.target.value })}
                  placeholder="Nome de quem está retirando"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <input
                  type="text"
                  value={borrowForm.borrowedByUnit}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrowedByUnit: e.target.value })}
                  placeholder="Ex: Apto 101, Casa 03"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={borrowForm.notes}
                  onChange={(e) => setBorrowForm({ ...borrowForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Informações adicionais..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setBorrowTarget(null); setBorrowForm({ ...emptyBorrowForm }); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={borrowMutation.isPending}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {borrowMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Emprestar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Devolver */}
      {returnTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Devolver Chave</h2>
              <button onClick={() => { setReturnTarget(null); setReturnNotes(''); }} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">{returnTarget.keyIdentifier}</p>
                <p className="text-xs text-green-600 mt-1">Emprestada para: {returnTarget.borrowedBy}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  placeholder="Observações sobre a devolução..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setReturnTarget(null); setReturnNotes(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => returnMutation.mutate({ id: returnTarget.id, notes: returnNotes })}
                  disabled={returnMutation.isPending}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {returnMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar Devolução
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marcar Perdida */}
      {lostTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Marcar como Perdida</h2>
              <button onClick={() => { setLostTarget(null); setLostNotes(''); }} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Atenção</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    A chave <strong>{lostTarget.keyIdentifier}</strong> será marcada como perdida.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalhes sobre a perda..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setLostTarget(null); setLostNotes(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => lostMutation.mutate({ id: lostTarget.id, notes: lostNotes })}
                  disabled={lostMutation.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {lostMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Histórico */}
      {historyTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Histórico da Chave</h2>
                <p className="text-sm text-slate-500">{historyTarget.keyIdentifier}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {logsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : !logs || logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum registro no histórico.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700 capitalize">
                            {log.action?.toLowerCase().replace('_', ' ') || 'Ação'}
                          </p>
                          <p className="text-xs text-slate-400 shrink-0">{formatDateTime(log.createdAt)}</p>
                        </div>
                        {log.performedBy && (
                          <p className="text-xs text-slate-500 mt-0.5">Por: {log.performedBy}</p>
                        )}
                        {log.borrowedBy && (
                          <p className="text-xs text-slate-500">Para: {log.borrowedBy}</p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-slate-400 mt-1 italic">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Excluir Chave</h3>
                  <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Deseja excluir a chave <strong>{deleteTarget.keyIdentifier}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
