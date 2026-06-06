import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import {
  Plus, Search, Loader2, X, Truck, Calendar,
  Clock, CheckCircle2, XCircle, Ban, Phone, Building2, User, Pencil
} from 'lucide-react';

type ScheduleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELED';
type MoveType = 'MOVE_IN' | 'MOVE_OUT' | 'LARGE_DELIVERY';

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Aprovada', className: 'bg-blue-100 text-blue-700' },
  REJECTED: { label: 'Rejeitada', className: 'bg-red-100 text-red-700' },
  COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-700' },
  CANCELED: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
};

const typeLabels: Record<MoveType, string> = {
  MOVE_IN: 'Mudança (Entrada)',
  MOVE_OUT: 'Mudança (Saída)',
  LARGE_DELIVERY: 'Entrega Grande',
};

const emptyForm = {
  unitId: '',
  type: 'MOVE_IN' as MoveType,
  scheduledDate: '',
  startTime: '',
  endTime: '',
  elevator: false,
  responsibleName: '',
  responsiblePhone: '',
  companyName: '',
  notes: '',
};

const tabs = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovadas' },
  { key: 'COMPLETED', label: 'Completadas' },
];

export default function AgendaMudancasPage() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['moving-schedules', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/moving-schedules/condominium/${condominiumId}`);
      return res.data.data.schedules;
    },
    enabled: !!condominiumId,
  });

  const { data: units } = useQuery({
    queryKey: ['units', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${condominiumId}`);
      return res.data.data?.units || res.data.units || [];
    },
    enabled: !!condominiumId && (showModal || !!editTarget),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/moving-schedules', { ...data, condominiumId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moving-schedules'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/moving-schedules/${editTarget.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moving-schedules'] });
      closeModal();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/moving-schedules/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moving-schedules'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/moving-schedules/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moving-schedules'] });
      setRejectTarget(null);
      setRejectReason('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/moving-schedules/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moving-schedules'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/moving-schedules/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moving-schedules'] }),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm({ ...emptyForm });
  };

  const openEdit = (schedule: any) => {
    setEditTarget(schedule);
    setForm({
      unitId: schedule.unitId || '',
      type: schedule.type,
      scheduledDate: schedule.scheduledDate?.split('T')[0] || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      elevator: schedule.elevator || false,
      responsibleName: schedule.responsibleName || '',
      responsiblePhone: schedule.responsiblePhone || '',
      companyName: schedule.companyName || '',
      notes: schedule.notes || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, elevator: form.elevator };
    if (editTarget) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = (schedules || []).filter((s: any) => {
    const matchesTab = activeTab === 'ALL' || s.status === activeTab;
    const matchesSearch =
      (s.responsibleName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.unit?.identifier || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName || '').toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda de Mudanças</h1>
          <p className="text-sm text-slate-500">Gerencie agendamentos de mudanças e entregas grandes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar Mudança
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
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
          placeholder="Buscar por responsável, unidade ou empresa..."
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
          <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Horário</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Responsável</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{typeLabels[s.type as MoveType] || s.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.unit?.identifier || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(s.scheduledDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {s.startTime || '—'} - {s.endTime || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-medium">{s.responsibleName || '—'}</p>
                      {s.companyName && <p className="text-xs text-slate-400">{s.companyName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[s.status as ScheduleStatus]?.className || 'bg-gray-100 text-gray-600'}`}>
                        {statusConfig[s.status as ScheduleStatus]?.label || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === 'PENDING' && isAdmin && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(s.id)}
                              title="Aprovar"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRejectTarget(s)}
                              title="Rejeitar"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {s.status === 'APPROVED' && isAdmin && (
                          <button
                            onClick={() => completeMutation.mutate(s.id)}
                            title="Completar"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {(s.status === 'PENDING' || s.status === 'APPROVED') && (
                          <button
                            onClick={() => cancelMutation.mutate(s.id)}
                            title="Cancelar"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {s.status === 'PENDING' && (
                          <button
                            onClick={() => openEdit(s)}
                            title="Editar"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Criar/Editar */}
      {(showModal || editTarget) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editTarget ? 'Editar Agendamento' : 'Agendar Mudança'}
              </h2>
              <button onClick={closeModal} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="move-type" className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                  <select
                    id="move-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as MoveType })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="MOVE_IN">Mudança (Entrada)</option>
                    <option value="MOVE_OUT">Mudança (Saída)</option>
                    <option value="LARGE_DELIVERY">Entrega Grande</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="move-unit" className="block text-sm font-medium text-slate-700 mb-1">Unidade *</label>
                  <select
                    id="move-unit"
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Selecione...</option>
                    {(units || []).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.identifier} - {u.block || ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="move-date" className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                  <input
                    id="move-date"
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="move-start" className="block text-sm font-medium text-slate-700 mb-1">Início *</label>
                  <input
                    id="move-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="move-end" className="block text-sm font-medium text-slate-700 mb-1">Fim *</label>
                  <input
                    id="move-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="elevator"
                  checked={form.elevator}
                  onChange={(e) => setForm({ ...form, elevator: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="elevator" className="text-sm text-slate-700">Necessita elevador de serviço</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="move-responsible" className="block text-sm font-medium text-slate-700 mb-1">Responsável *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="move-responsible"
                      type="text"
                      value={form.responsibleName}
                      onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
                      placeholder="Nome do responsável"
                      className="w-full pl-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="move-phone" className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="move-phone"
                      type="tel"
                      value={form.responsiblePhone}
                      onChange={(e) => setForm({ ...form, responsiblePhone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Nome da empresa de mudança"
                    className="w-full pl-10 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Informações adicionais..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rejeitar */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Rejeitar Agendamento</h2>
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Informe o motivo da rejeição do agendamento de <strong>{rejectTarget.responsibleName}</strong>.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Motivo da rejeição..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason })}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
