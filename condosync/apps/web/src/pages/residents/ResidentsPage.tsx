import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Users, Plus, Search, Loader2, ChevronDown, ChevronRight, Pencil, Trash2, UserPlus, X } from 'lucide-react';

const emptyForm = { name: '', email: '', phone: '', cpf: '', unitId: '' };

export function ResidentsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [depTarget, setDepTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ name: '', phone: '', cpf: '', unitId: '' });
  const [depForm, setDepForm] = useState({ name: '', relationship: '', cpf: '' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: residents, isLoading } = useQuery({
    queryKey: ['residents', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/residents/condominium/${selectedCondominiumId}`);
      return res.data.data.residents;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units;
    },
    enabled: !!selectedCondominiumId && (showModal || !!editTarget),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/residents', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); setShowModal(false); setForm({ ...emptyForm }); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.patch(`/residents/${editTarget.id}`, { ...d, unitId: d.unitId || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); setEditTarget(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/residents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); setDeleteTarget(null); setExpanded(null); },
  });

  const addDepMutation = useMutation({
    mutationFn: (d: typeof depForm) => api.post('/residents/dependents', { ...d, unitId: depTarget?.unitId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); setDepTarget(null); setDepForm({ name: '', relationship: '', cpf: '' }); },
  });

  const removeDepMutation = useMutation({
    mutationFn: (depId: string) => api.delete(`/residents/dependents/${depId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residents'] }),
  });

  const openEdit = (r: any) => {
    setEditForm({ name: r.user?.name ?? '', phone: r.user?.phone ?? '', cpf: r.user?.cpf ?? '', unitId: r.unit?.id ?? '' });
    setEditTarget(r);
  };

  const filtered = ((residents || []) as any[]).filter((r: any) =>
    (r.user?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.user?.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moradores</h1>
          <p className="text-muted-foreground">Gerenciamento de moradores e dependentes</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Novo Morador
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, email ou unidade..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
            <Users className="w-10 h-10" />
            <p>Nenhum morador encontrado</p>
          </div>
        ) : (
          filtered.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {r.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.unit && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Unid. {r.unit.identifier}{r.unit.block ? ' / Bloco ' + r.unit.block : ''}
                    </span>
                  )}
                  {expanded === r.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              {expanded === r.id && (
                <div className="border-t px-4 py-4 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-medium">Telefone:</span> {r.user?.phone || '—'}</p>
                    <p><span className="font-medium">CPF:</span> {r.user?.cpf || '—'}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Dependentes</p>
                      {isAdmin && r.unitId && (
                        <button onClick={() => setDepTarget(r)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <UserPlus className="w-3 h-3" /> Adicionar
                        </button>
                      )}
                    </div>
                    {r.dependents?.length > 0 ? (
                      <ul className="space-y-1 ml-1">
                        {r.dependents.map((d: any) => (
                          <li key={d.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{d.name} <span className="text-gray-400">({d.relationship})</span></span>
                            {isAdmin && (
                              <button onClick={() => removeDepMutation.mutate(d.id)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-3 h-3" /></button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum dependente</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEdit(r)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-100 text-gray-700">
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={() => setDeleteTarget(r)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-600">
                        <Trash2 className="w-3 h-3" /> Remover do condomínio
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Novo Morador */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Morador</h2>
            <div className="space-y-3">
              {[['Nome completo *', 'name', 'text'], ['E-mail *', 'email', 'email'], ['Telefone', 'phone', 'tel'], ['CPF', 'cpf', 'text']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade</label>
                <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {((units || []) as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.identifier}{u.block ? ' / Bloco ' + u.block : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            {createMutation.isError && <p className="text-sm text-red-600">Erro ao cadastrar. Verifique os dados.</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.email || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Morador */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Morador</h2>
            <div className="space-y-3">
              {[['Nome completo', 'name', 'text'], ['Telefone', 'phone', 'tel'], ['CPF', 'cpf', 'text']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(editForm as any)[key]} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade</label>
                <select value={editForm.unitId} onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sem unidade</option>
                  {((units || []) as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.identifier}{u.block ? ' / Bloco ' + u.block : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Remoção */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Remover Morador</h2>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja remover <span className="font-medium text-gray-800">{deleteTarget.user?.name}</span> deste condomínio? O usuário não será excluído do sistema.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Dependente */}
      {depTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Adicionar Dependente</h2>
            <p className="text-xs text-muted-foreground">Dependente de: <span className="font-medium">{depTarget.user?.name}</span></p>
            <div className="space-y-3">
              {[['Nome *', 'name', 'text'], ['Parentesco *', 'relationship', 'text'], ['CPF', 'cpf', 'text']].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input type={type} value={(depForm as any)[key]} onChange={(e) => setDepForm({ ...depForm, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDepTarget(null); setDepForm({ name: '', relationship: '', cpf: '' }); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => addDepMutation.mutate(depForm)} disabled={!depForm.name || !depForm.relationship || addDepMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {addDepMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
