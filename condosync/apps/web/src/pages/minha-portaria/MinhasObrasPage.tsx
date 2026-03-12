import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus, UserMinus, CheckCircle2, XCircle, Clock, Hammer } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TIPOS = ['pintura', 'hidráulica', 'elétrica', 'estrutural', 'outro'] as const;

interface Provider {
  id: string;
  name: string;
  serviceType: string;
  document?: string;
  phone?: string;
  company?: string;
}

interface Renovation {
  id: string;
  description: string;
  type: string;
  startDate: string;
  endDate?: string;
  status: string;
  notes?: string;
  rejectedReason?: string;
  authorizedProviders: Provider[];
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:     { label: 'Aguardando aprovação', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED:    { label: 'Aprovada',             color: 'bg-green-100 text-green-800',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: 'Em andamento',         color: 'bg-blue-100 text-blue-800',     icon: <Hammer className="w-3.5 h-3.5" /> },
  COMPLETED:   { label: 'Concluída',            color: 'bg-gray-100 text-gray-700',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED:    { label: 'Reprovada',            color: 'bg-red-100 text-red-800',       icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function MinhasObrasPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const unitId = user?.unitId;

  const [showCreate, setShowCreate] = useState(false);
  const [showProvider, setShowProvider] = useState<string | null>(null);
  const [form, setForm] = useState({ description: '', type: TIPOS[0], startDate: '', endDate: '', notes: '' });
  const [providerForm, setProviderForm] = useState({ name: '', serviceType: '', document: '', phone: '', company: '' });

  const { data, isLoading } = useQuery<Renovation[]>({
    queryKey: ['renovations-unit', unitId],
    queryFn: async () => {
      const res = await api.get(`/renovations/unit/${unitId}`);
      return res.data.data.renovations;
    },
    enabled: !!unitId,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/renovations', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['renovations-unit'] }); setShowCreate(false); setForm({ description: '', type: TIPOS[0], startDate: '', endDate: '', notes: '' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/renovations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renovations-unit'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/renovations/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renovations-unit'] }),
  });

  const addProviderMutation = useMutation({
    mutationFn: ({ renovationId, data }: { renovationId: string; data: object }) =>
      api.post(`/renovations/${renovationId}/providers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['renovations-unit'] });
      setShowProvider(null);
      setProviderForm({ name: '', serviceType: '', document: '', phone: '', company: '' });
    },
  });

  const removeProviderMutation = useMutation({
    mutationFn: ({ renovationId, providerId }: { renovationId: string; providerId: string }) =>
      api.delete(`/renovations/${renovationId}/providers/${providerId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renovations-unit'] }),
  });

  const handleCreate = () => {
    if (!unitId || !user?.condominiumId) return;
    createMutation.mutate({
      ...form,
      unitId,
      condominiumId: user.condominiumId,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Carregando obras...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
          <p className="text-sm text-gray-500 mt-1">Solicite autorização e gerencie os prestadores da sua unidade</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Nova Solicitação de Obra</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de obra</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof TIPOS[number] }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição detalhada</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Descreva o serviço que será realizado..." className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Início previsto</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fim previsto (opcional)</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Informações adicionais..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={createMutation.isPending || !form.description || !form.startDate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {createMutation.isPending ? 'Enviando...' : 'Solicitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showProvider && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Adicionar Prestador</h2>
            <div className="space-y-3">
              {[
                ['name', 'Nome completo *'],
                ['serviceType', 'Tipo de serviço *'],
                ['document', 'CPF/CNPJ'],
                ['phone', 'Telefone'],
                ['company', 'Empresa'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input value={(providerForm as Record<string, string>)[key]} onChange={e => setProviderForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowProvider(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => addProviderMutation.mutate({ renovationId: showProvider, data: providerForm })}
                disabled={addProviderMutation.isPending || !providerForm.name || !providerForm.serviceType}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {addProviderMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renovations List */}
      <div className="space-y-4">
        {!data?.length && (
          <div className="text-center py-16 text-gray-400">
            <Hammer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma obra cadastrada.</p>
            <p className="text-sm mt-1">Clique em "Nova Solicitação" para começar.</p>
          </div>
        )}

        {data?.map(r => {
          const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
          const canMarkInProgress = r.status === 'APPROVED';
          const canMarkComplete = r.status === 'IN_PROGRESS';
          const canDelete = r.status === 'PENDING' || r.status === 'REJECTED';

          return (
            <div key={r.id} className="bg-white border rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 capitalize">{r.type}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                  {r.rejectedReason && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 rounded px-2 py-1">Motivo: {r.rejectedReason}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                    <span>Início: {new Date(r.startDate).toLocaleDateString('pt-BR')}</span>
                    {r.endDate && <span>Fim: {new Date(r.endDate).toLocaleDateString('pt-BR')}</span>}
                    <span>Criada em: {new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {canMarkInProgress && (
                    <button onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'IN_PROGRESS' })}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                      Iniciar obra
                    </button>
                  )}
                  {canMarkComplete && (
                    <button onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'COMPLETED' })}
                      className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100">
                      Concluir
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => deleteMutation.mutate(r.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Providers */}
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prestadores autorizados</span>
                  {r.status !== 'COMPLETED' && r.status !== 'REJECTED' && (
                    <button onClick={() => setShowProvider(r.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  )}
                </div>
                {r.authorizedProviders.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum prestador cadastrado</p>
                ) : (
                  <div className="space-y-1.5">
                    {r.authorizedProviders.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{p.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{p.serviceType}</span>
                          {p.company && <span className="text-xs text-gray-400 ml-2">— {p.company}</span>}
                          {p.document && <span className="text-xs text-gray-400 ml-2">CPF/CNPJ: {p.document}</span>}
                          {p.phone && <span className="text-xs text-gray-400 ml-2">Tel: {p.phone}</span>}
                        </div>
                        <button onClick={() => removeProviderMutation.mutate({ renovationId: r.id, providerId: p.id })}
                          className="text-gray-300 hover:text-red-500 p-1 rounded">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
