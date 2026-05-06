import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Building2, Plus, Loader2, Users, Home, UserPlus, Trash2, UserCog, Pencil, KeyRound, Eye, EyeOff } from 'lucide-react';
import { maskPhone, validatePhone, validateEmail } from '../../lib/utils';

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

  // ── Create — step 1: condomínio, step 2: admin ─────────────────
  const [showModal, setShowModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createdCondoId, setCreatedCondoId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});
  const [showAdminPwd, setShowAdminPwd] = useState(false);

  // ── Edit ───────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // ── Members / Password ─────────────────────────────────────────
  const [membersTarget, setMembersTarget] = useState<any | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const { data: condominiums, isLoading } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get('/condominiums');
      return res.data.data.condominiums as any[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/condominiums', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setCreatedCondoId(res.data.data.condominium.id);
      setCreateStep(2);
    },
  });

  const setupAdminMutation = useMutation({
    mutationFn: (d: typeof adminForm) =>
      api.post(`/condominiums/${createdCondoId}/setup-admin`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setShowModal(false);
      setCreateStep(1);
      setCreatedCondoId(null);
      setFormErrors({});
      setAdminErrors({});
      setForm({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' });
      setAdminForm({ name: '', email: '', password: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.put(`/condominiums/${editTarget?.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setShowEditModal(false);
      setEditTarget(null);
      setEditErrors({});
    },
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['condominium-members', membersTarget?.id],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${membersTarget!.id}/members`);
      return res.data.data.members as any[];
    },
    enabled: !!membersTarget,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api.patch(`/users/${userId}/reset-password`, { newPassword: password }),
    onSuccess: () => {
      setResetSuccess('Senha redefinida com sucesso!');
      setNewPassword('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetTarget(null);
        setResetSuccess('');
      }, 1500);
    },
    onError: (err: any) => {
      setResetError(err.response?.data?.message || 'Erro ao redefinir senha.');
    },
  });

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
              {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
              <div className="border-t pt-2 flex gap-3">
                <button
                  onClick={() => {
                    setEditForm({
                      name: c.name ?? '', address: c.address ?? '', city: c.city ?? '',
                      state: c.state ?? '', zipCode: c.zipCode ?? '', cnpj: c.cnpj ?? '',
                      phone: c.phone ?? '', email: c.email ?? '',
                    });
                    setEditTarget(c);
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => {
                    setMembersTarget(c);
                    setShowMembersModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Senhas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">

            {/* ── Indicador de etapa ── */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${createStep === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
                {createStep === 1 ? '1' : '✓'}
              </div>
              <div className="flex-1 h-1 rounded bg-gray-200">
                <div className={`h-1 rounded bg-blue-500 transition-all ${createStep === 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${createStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            </div>

            {createStep === 1 ? (
              <>
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
                          const nextValue =
                            key === 'cnpj' ? formatCnpj(value)
                            : key === 'phone' ? maskPhone(value)
                            : value;
                          setForm({ ...form, [key]: nextValue });
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors[key] ? 'border-red-400' : ''}`}
                      />
                      {key === 'cnpj' && form.cnpj && !isCnpjComplete(form.cnpj) && (
                        <p className="text-xs text-red-600">CNPJ incompleto. Preencha os 14 dígitos.</p>
                      )}
                      {formErrors[key] && <p className="text-xs text-red-500 mt-0.5">{formErrors[key]}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowModal(false); setFormErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const errs: Record<string, string> = {};
                      const phoneErr = validatePhone(form.phone);
                      if (phoneErr) errs.phone = phoneErr;
                      const emailErr = validateEmail(form.email);
                      if (emailErr) errs.email = emailErr;
                      if (Object.keys(errs).length) { setFormErrors(errs); return; }
                      setFormErrors({});
                      createMutation.mutate(form);
                    }}
                    disabled={!form.name || createMutation.isPending || !isCnpjComplete(form.cnpj)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Criando...' : 'Próximo →'}
                  </button>
                </div>
                {createMutation.isError && (
                  <p className="text-sm text-red-600">Erro ao criar condomínio. Verifique os dados.</p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Administrador do Condomínio</h2>
                <p className="text-sm text-muted-foreground">Crie o usuário que irá gerenciar este condomínio. Você pode pular esta etapa e configurar depois.</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome *</label>
                    <input
                      type="text"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${adminErrors.name ? 'border-red-400' : ''}`}
                      placeholder="Nome completo"
                    />
                    {adminErrors.name && <p className="text-xs text-red-500">{adminErrors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">E-mail *</label>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${adminErrors.email ? 'border-red-400' : ''}`}
                      placeholder="admin@exemplo.com"
                    />
                    {adminErrors.email && <p className="text-xs text-red-500">{adminErrors.email}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Senha *</label>
                    <div className="relative">
                      <input
                        type={showAdminPwd ? 'text' : 'password'}
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${adminErrors.password ? 'border-red-400' : ''}`}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {adminErrors.password && <p className="text-xs text-red-500">{adminErrors.password}</p>}
                  </div>
                </div>
                {setupAdminMutation.isError && (
                  <p className="text-sm text-red-600">Erro ao criar administrador. Verifique os dados.</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Pular: fecha sem criar admin
                      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
                      setShowModal(false);
                      setCreateStep(1);
                      setCreatedCondoId(null);
                      setAdminForm({ name: '', email: '', password: '' });
                      setForm({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' });
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg text-sm"
                  >
                    Pular
                  </button>
                  <button
                    onClick={() => {
                      const errs: Record<string, string> = {};
                      if (!adminForm.name || adminForm.name.length < 2) errs.name = 'Nome obrigatório (mín. 2 caracteres)';
                      if (!adminForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) errs.email = 'E-mail inválido';
                      if (!adminForm.password || adminForm.password.length < 6) errs.password = 'Senha deve ter pelo menos 6 caracteres';
                      if (Object.keys(errs).length) { setAdminErrors(errs); return; }
                      setAdminErrors({});
                      setupAdminMutation.mutate(adminForm);
                    }}
                    disabled={setupAdminMutation.isPending}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {setupAdminMutation.isPending ? 'Criando...' : 'Criar Admin'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editTarget && (
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
                      const nextValue =
                        key === 'cnpj' ? formatCnpj(value)
                        : key === 'phone' ? maskPhone(value)
                        : value;
                      setEditForm({ ...editForm, [key]: nextValue });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors[key] ? 'border-red-400' : ''}`}
                  />
                  {editErrors[key] && <p className="text-xs text-red-500 mt-0.5">{editErrors[key]}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowEditModal(false); setEditErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const phoneErr = validatePhone(editForm.phone);
                  if (phoneErr) errs.phone = phoneErr;
                  const emailErr = validateEmail(editForm.email);
                  if (emailErr) errs.email = emailErr;
                  if (Object.keys(errs).length) { setEditErrors(errs); return; }
                  setEditErrors({});
                  updateMutation.mutate(editForm);
                }}
                disabled={!editForm.name || updateMutation.isPending || !isCnpjComplete(editForm.cnpj)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-red-600">Erro ao atualizar condomínio.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Members / Senhas Modal ── */}
      {showMembersModal && membersTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Usuários — {membersTarget.name}
              </h2>
              <button
                onClick={() => { setShowMembersModal(false); setMembersTarget(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : !members?.length ? (
              <p className="text-sm text-gray-500 py-4 text-center">Nenhum membro cadastrado.</p>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                      <span className="inline-block mt-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setResetTarget(m);
                        setNewPassword('');
                        setShowPwd(false);
                        setResetError('');
                        setResetSuccess('');
                        setShowResetModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 whitespace-nowrap"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Definir senha
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetModal && resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Definir Senha</h2>
            <p className="text-sm text-gray-600">
              Usuário: <span className="font-medium">{resetTarget.user.name}</span>
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 pr-9 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {resetError && <p className="text-xs text-red-600 mt-0.5">{resetError}</p>}
              {resetSuccess && <p className="text-xs text-green-600 mt-0.5">{resetSuccess}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowResetModal(false); setResetTarget(null); }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newPassword.length < 6) {
                    setResetError('A senha deve ter pelo menos 6 caracteres.');
                    return;
                  }
                  resetPasswordMutation.mutate({ userId: resetTarget.user.id, password: newPassword });
                }}
                disabled={!newPassword || resetPasswordMutation.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {resetPasswordMutation.isPending ? 'Salvando...' : 'Salvar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
