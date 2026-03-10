import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Building2, Plus, Loader2, Users, Home, UserPlus, Trash2, UserCog } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  SERVICE_PROVIDER: 'Prestador',
  COUNCIL_MEMBER: 'Conselheiro',
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  let formatted = '';

  if (digits.length > 0) {
    formatted = digits.slice(0, 2);
  }
  if (digits.length >= 3) {
    formatted += '.' + digits.slice(2, 5);
  }
  if (digits.length >= 6) {
    formatted += '.' + digits.slice(5, 8);
  }
  if (digits.length >= 9) {
    formatted += '/' + digits.slice(8, 12);
  }
  if (digits.length >= 13) {
    formatted += '-' + digits.slice(12, 14);
  }

  return formatted;
}

function isCnpjComplete(value: string) {
  const digits = value.replace(/\D/g, '');
  return !value || digits.length === 14;
}

export function CondominiumsPage() {
  const queryClient = useQueryClient();
  const emptyForm = { name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' };
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [membersTarget, setMembersTarget] = useState<any | null>(null);
  const [addMemberForm, setAddMemberForm] = useState({ userId: '', role: 'SYNDIC' });  

  const { data: condominiums, isLoading } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get('/condominiums');
      return res.data.data.condominiums as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/condominiums', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.put(`/condominiums/${editTarget?.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/condominiums/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setDeleteTarget(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/condominiums/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
    },
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['condominium-members', membersTarget?.id],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${membersTarget.id}/members`);
      return res.data.data.members as any[];
    },
    enabled: !!membersTarget,
  });

  const { data: usersData } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const res = await api.get('/users?limit=200');
      return res.data.data.users as any[];
    },
    enabled: !!membersTarget,
  });

  const addMemberMutation = useMutation({
    mutationFn: (d: { userId: string; role: string }) =>
      api.post(`/condominiums/${membersTarget?.id}/members`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominium-members', membersTarget?.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setAddMemberForm({ userId: '', role: 'SYNDIC' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/condominiums/${membersTarget?.id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominium-members', membersTarget?.id] });
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
    },
  });

  const openEdit = (c: any) => {
    setEditForm({
      name: c.name ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      zipCode: c.zipCode ?? '',
      cnpj: c.cnpj ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    });
    setEditTarget(c);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Condomínios (Admin)</h1>
          <p className="text-muted-foreground">Gestão de todos os condomínios da plataforma</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Condomínio
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : !condominiums?.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <Building2 className="w-10 h-10" />
          <p>Nenhum condomínio cadastrado</p>
          <button onClick={() => setShowModal(true)} className="text-blue-600 text-sm hover:underline">
            Criar o primeiro condomínio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {condominiums.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl border p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{c.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {c.city && <p className="text-xs text-muted-foreground">{c.city}{c.state ? ` - ${c.state}` : ''}</p>}
                    {c.address && (
                      <p className="text-xs text-muted-foreground truncate">{c.address}</p>
                    )}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {c._count?.units ?? 0} unidades</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c._count?.condominiumUsers ?? 0} membros</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {c.cnpj && <p>CNPJ: {c.cnpj}</p>}
                {c.phone && <p>Telefone: {c.phone}</p>}
                {c.email && <p className="truncate">E-mail: {c.email}</p>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => toggleActiveMutation.mutate(c.id)}
                  disabled={toggleActiveMutation.isPending}
                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  {c.isActive ? 'Inativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => setMembersTarget(c)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50"
                >
                  <UserCog className="w-3 h-3" /> Membros
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 text-gray-700 min-w-[90px]"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteTarget(c)}
                  className="flex-1 px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-600 hover:bg-red-50 min-w-[90px]"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Condomínio</h2>
            <div className="space-y-3">
              {[
                ['Nome *', 'name', 'text'],
                ['Endereço', 'address', 'text'],
                ['Cidade', 'city', 'text'],
                ['Estado (UF)', 'state', 'text'],
                ['CEP', 'zipCode', 'text'],
                ['CNPJ', 'cnpj', 'text'],
                ['Telefone', 'phone', 'text'],
                ['E-mail', 'email', 'email'],
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      const nextValue = key === 'cnpj' ? formatCnpj(value) : value;
                      setForm({ ...form, [key]: nextValue });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {key === 'cnpj' && form.cnpj && !isCnpjComplete(form.cnpj) && (
                    <p className="text-xs text-red-600">CNPJ incompleto. Preencha os 14 dígitos.</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending || !isCnpjComplete(form.cnpj)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Erro ao criar condomínio. Verifique os dados.</p>
            )}
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Condomínio</h2>
            <div className="space-y-3">
              {[
                ['Nome *', 'name', 'text'],
                ['Endereço', 'address', 'text'],
                ['Cidade', 'city', 'text'],
                ['Estado (UF)', 'state', 'text'],
                ['CEP', 'zipCode', 'text'],
                ['CNPJ', 'cnpj', 'text'],
                ['Telefone', 'phone', 'text'],
                ['E-mail', 'email', 'email'],
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(editForm as any)[key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      const nextValue = key === 'cnpj' ? formatCnpj(value) : value;
                      setEditForm({ ...editForm, [key]: nextValue });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {key === 'cnpj' && editForm.cnpj && !isCnpjComplete(editForm.cnpj) && (
                    <p className="text-xs text-red-600">CNPJ incompleto. Preencha os 14 dígitos.</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={!editForm.name || updateMutation.isPending || !isCnpjComplete(editForm.cnpj)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {membersTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Membros — {membersTarget.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Gerencie os usuários vinculados a este condomínio</p>
              </div>
              <button onClick={() => setMembersTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {/* Adicionar membro */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Adicionar membro</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={addMemberForm.userId}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, userId: e.target.value })}
                  className="flex-1 min-w-[180px] px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um usuário...</option>
                  {(usersData ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                  ))}
                </select>
                <select
                  value={addMemberForm.role}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ROLE_LABELS)
                    .filter(([k]) => k !== 'SUPER_ADMIN')
                    .map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <button
                  onClick={() => addMemberMutation.mutate(addMemberForm)}
                  disabled={!addMemberForm.userId || addMemberMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {addMemberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Adicionar
                </button>
              </div>
              {addMemberMutation.isError && (
                <p className="text-xs text-red-600">Erro ao adicionar membro. Verifique os dados.</p>
              )}
            </div>

            {/* Lista de membros */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Membros atuais</p>
              {membersLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              ) : !membersData?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro vinculado ainda.</p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden">
                  {membersData.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                        {m.unit && (
                          <span className="text-xs text-muted-foreground">{m.unit.identifier}</span>
                        )}
                        <button
                          onClick={() => removeMemberMutation.mutate(m.user.id)}
                          disabled={removeMemberMutation.isPending}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                          title="Remover vínculo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={() => setMembersTarget(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Excluir Condomínio</h2>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o condomínio <span className="font-medium text-gray-900">{deleteTarget.name}</span>?
              Esta ação só é permitida para condomínios sem unidades ou membros vinculados.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-600">Não foi possível excluir. Verifique se o condomínio não possui unidades ou membros vinculados.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
