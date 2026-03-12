import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { Users, Plus, Search, LogIn, LogOut, CheckCircle, XCircle, Clock, Loader2, Pencil } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  AUTHORIZED: { label: 'Autorizado', color: 'bg-blue-100 text-blue-700' },
  DENIED: { label: 'Negado', color: 'bg-red-100 text-red-700' },
  INSIDE: { label: 'Dentro', color: 'bg-green-100 text-green-700' },
  LEFT: { label: 'Saiu', color: 'bg-gray-100 text-gray-700' },
};

export function VisitorsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', document: '', documentType: 'RG', phone: '', company: '', reason: '', unitId: '' });
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', document: '', documentType: 'RG', phone: '', company: '', reason: '', notes: '' });

  const { data: unitsData } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as { id: string; identifier: string; block?: string }[];
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}`, {
        params: { status: statusFilter || undefined, limit: 50 },
      });
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const entryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/entry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/exit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/visitors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setShowModal(false);
      setForm({ name: '', document: '', documentType: 'RG', phone: '', company: '', reason: '', unitId: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: typeof editForm & { id: string }) => api.patch(`/visitors/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const visitors = (data?.visitors || []).filter((v: any) =>
    (v.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const canRegisterEntry = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visitantes</h1>
          <p className="text-muted-foreground">Controle de entrada e saída de visitantes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar Visitante
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou unidade..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="AUTHORIZED">Autorizados</option>
          <option value="INSIDE">Dentro</option>
          <option value="LEFT">Saíram</option>
          <option value="DENIED">Negados</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Users className="w-10 h-10" />
            <p>Nenhum visitante encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Visitante</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entrada</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Saída</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  {canRegisterEntry && (
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visitors.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        {v.company && <p className="text-xs text-muted-foreground">{v.company}</p>}
                        {v.document && <p className="text-xs text-muted-foreground">{v.documentType}: {v.document}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{v.unit?.block ? `${v.unit.block} - ` : ''}{v.unit?.identifier}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.entryAt ? formatDateTime(v.entryAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.exitAt ? formatDateTime(v.exitAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[v.status]?.color}`}>
                        {STATUS_LABELS[v.status]?.label}
                      </span>
                    </td>
                    {canRegisterEntry && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {(v.status === 'PENDING' || v.status === 'AUTHORIZED') && (
                            <button
                              onClick={() => {
                                setEditTarget(v);
                                setEditForm({ name: v.name, document: v.document || '', documentType: v.documentType || 'RG', phone: v.phone || '', company: v.company || '', reason: v.reason || '', notes: v.notes || '' });
                                setEditModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                              title="Editar visitante"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                          )}
                          {v.status === 'AUTHORIZED' || v.status === 'PENDING' ? (
                            <button
                              onClick={() => entryMutation.mutate(v.id)}
                              disabled={entryMutation.isPending}
                              className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                            >
                              <LogIn className="w-3 h-3" />
                              Entrada
                            </button>
                          ) : v.status === 'INSIDE' ? (
                            <button
                              onClick={() => exitMutation.mutate(v.id)}
                              disabled={exitMutation.isPending}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                            >
                              <LogOut className="w-3 h-3" />
                              Saída
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de registro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Visitante</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Documento</label>
                <input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={form.documentType}
                  onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Motivo da visita</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: visita familiar, entrega, etc."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {(unitsData || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `Bloco ${u.block} — ` : ''}{u.identifier}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name || !form.unitId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de edição */}
      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Visitante</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome completo" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Documento</label>
                <input value={editForm.document} onChange={(e) => setEditForm({ ...editForm, document: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Número" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select value={editForm.documentType} onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(11) 99999-0000" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa</label>
                <input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Opcional" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Motivo da visita</label>
                <input value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: visita familiar, entrega..." />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditModal(false); setEditTarget(null); }} className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate({ ...editForm, id: editTarget.id })}
                disabled={updateMutation.isPending || !editForm.name}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
