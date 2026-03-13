import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Receipt, Plus, Search, Loader2, CheckCircle, Shuffle, ExternalLink, Copy, QrCode, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

const chargeStatusLabels: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  PAID: { label: 'Pago', className: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Em Atraso', className: 'bg-red-100 text-red-700' },
  CANCELED: { label: 'Cancelada', className: 'bg-gray-100 text-gray-500' },
};

export function ChargesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRatioModal, setShowRatioModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', dueDate: '', unitId: '' });
  const [ratioForm, setRatioForm] = useState({ description: '', totalAmount: '', dueDate: '', method: 'equal' });
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', dueDate: '', unitId: '' });
  const [pixModal, setPixModal] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: charges, isLoading } = useQuery({
    queryKey: ['charges', selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const url = `/finance/charges/${selectedCondominiumId}${statusFilter ? `?status=${statusFilter}` : ''}`;
      const res = await api.get(url);
      return res.data.data.charges;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/units/condominium/${selectedCondominiumId}`); return res.data.data.units; },
    enabled: !!selectedCondominiumId && (showCreateModal || editModal),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/finance/charges/${id}/pay`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges'] }),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/finance/charges', { ...d, amount: parseFloat(d.amount), condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['charges'] }); setShowCreateModal(false); },
  });

  const ratioMutation = useMutation({
    mutationFn: (d: typeof ratioForm) => api.post('/finance/charges/ratio', { ...d, totalAmount: parseFloat(d.totalAmount), condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['charges'] }); setShowRatioModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) =>
      api.patch(`/finance/charges/${editTarget?.id}`, {
        ...d,
        amount: parseFloat(d.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance/charges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/finance/charges/${id}/sync`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charges'] }),
  });

  const filtered = ((charges || []) as any[]).filter((c: any) =>
    c.description?.toLowerCase().includes(search.toLowerCase()) || c.unit?.identifier?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobranças</h1>
          <p className="text-muted-foreground">Boletos e taxas condominiais</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowRatioModal(true)} className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Shuffle className="w-4 h-4" /> Rateio
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Nova Cobrança
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          {Object.entries(chargeStatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground"><Receipt className="w-10 h-10" /><p>Nenhuma cobrança encontrada</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pagamento</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c: any) => {
                  const st = chargeStatusLabels[c.status] || chargeStatusLabels.PENDING;
                  const hasGateway = !!(c.paymentLink || c.boletoUrl || c.pixCopyPaste);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.unit?.identifier || '—'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(c.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.dueDate)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.paymentLink && (
                            <a href={c.paymentLink} target="_blank" rel="noopener noreferrer" title="Link de pagamento" className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {c.boletoUrl && (
                            <a href={c.boletoUrl} target="_blank" rel="noopener noreferrer" title="Boleto" className="p-1.5 rounded hover:bg-orange-50 text-orange-600">
                              <Receipt className="w-4 h-4" />
                            </a>
                          )}
                          {c.pixCopyPaste && (
                            <button onClick={() => setPixModal({ qrCode: c.pixQrCode, copyPaste: c.pixCopyPaste })} title="PIX" className="p-1.5 rounded hover:bg-green-50 text-green-600">
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && c.status === 'PENDING' && !hasGateway && (
                            <button onClick={() => syncMutation.mutate(c.id)} disabled={syncMutation.isPending} title="Sincronizar com gateway" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {!hasGateway && c.status === 'PENDING' && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.status === 'PENDING' && (
                              <button onClick={() => payMutation.mutate(c.id)} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                                <CheckCircle className="w-3 h-3" /> Marcar Pago
                              </button>
                            )}
                            {c.status === 'PENDING' && (
                              <button
                                onClick={() => {
                                  setEditForm({
                                    description: c.description ?? '',
                                    amount: String(c.amount ?? ''),
                                    dueDate: c.dueDate ? String(c.dueDate).slice(0, 10) : '',
                                    unitId: c.unitId ?? '',
                                  });
                                  setEditTarget(c);
                                  setEditModal(true);
                                }}
                                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                              >
                                Editar
                              </button>
                            )}
                            {c.status === 'PENDING' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Confirmar cancelamento desta cobrança?')) {
                                    deleteMutation.mutate(c.id);
                                  }
                                }}
                                className="px-2 py-1 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nova Cobrança</h2>
            <div className="space-y-3">
              {[['Descrição *', 'description', 'text'], ['Valor (R$) *', 'amount', 'number'], ['Data de Vencimento *', 'dueDate', 'date']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {((units || []) as any[]).map((u: any) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ' / Bloco ' + u.block : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.description || !form.amount || !form.dueDate || !form.unitId || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Criar</button>
            </div>
          </div>
        </div>
      )}

      {showRatioModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Rateio de Cobrança</h2>
            <p className="text-sm text-muted-foreground">O valor será dividido entre todas as unidades.</p>
            <div className="space-y-3">
              {[['Descrição *', 'description', 'text'], ['Valor Total (R$) *', 'totalAmount', 'number'], ['Vencimento *', 'dueDate', 'date']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(ratioForm as any)[key]} onChange={(e) => setRatioForm({ ...ratioForm, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Método de Divisão</label>
                <select value={ratioForm.method} onChange={(e) => setRatioForm({ ...ratioForm, method: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="equal">Igualitário</option>
                  <option value="fraction">Por fração ideal</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRatioModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => ratioMutation.mutate(ratioForm)} disabled={!ratioForm.description || !ratioForm.totalAmount || !ratioForm.dueDate || ratioMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Ratear</button>
            </div>
          </div>
        </div>
      )}

      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Cobrança</h2>
            <div className="space-y-3">
              {[['Descrição *', 'description', 'text'], ['Valor (R$) *', 'amount', 'number'], ['Data de Vencimento *', 'dueDate', 'date']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(editForm as any)[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select
                  value={editForm.unitId}
                  onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {((units || []) as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.identifier}
                      {u.block ? ' / Bloco ' + u.block : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTarget(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending || !editForm.description || !editForm.amount || !editForm.dueDate || !editForm.unitId}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal PIX */}
      {pixModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Pagar via PIX</h2>
            {pixModal.qrCode && (
              <div className="flex justify-center">
                <img src={`data:image/png;base64,${pixModal.qrCode}`} alt="QR Code PIX" className="w-48 h-48 border rounded-lg" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Código PIX (copia e cola)</p>
              <div className="flex gap-2">
                <input readOnly value={pixModal.copyPaste} className="flex-1 px-3 py-2 border rounded-lg text-xs bg-gray-50 font-mono" />
                <button
                  onClick={() => navigator.clipboard.writeText(pixModal.copyPaste)}
                  className="p-2 border rounded-lg hover:bg-gray-50"
                  title="Copiar código PIX"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button onClick={() => setPixModal(null)} className="w-full px-4 py-2 border rounded-lg text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
