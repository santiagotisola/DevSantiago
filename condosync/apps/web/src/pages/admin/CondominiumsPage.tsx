import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Building2, Plus, Loader2, Users, Home, UserCog, Pencil, KeyRound, Eye, EyeOff, Search, Power, Trash2, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Package, CheckCircle2, X } from 'lucide-react';
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

  // ── Setup Admin para condomínio existente ──────────────────────
  const [showSetupAdminModal, setShowSetupAdminModal] = useState(false);
  const [setupAdminTargetCondo, setSetupAdminTargetCondo] = useState<any | null>(null);

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

  // ── Filtros / busca / paginação / ordenação ────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  type SortKey = 'name' | 'city' | 'cnpj' | 'units' | 'members' | 'status';
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Atribuir plano ─────────────────────────────────────────────
  const [planTarget, setPlanTarget] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState<{ planSlug: string; maxUnits: string; useDefault: boolean }>(
    { planSlug: '', maxUnits: '', useDefault: true },
  );
  const [planError, setPlanError] = useState('');
  const [planToast, setPlanToast] = useState<string | null>(null);

  // ── Excluir / Toggle Ativo ─────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBlockers, setDeleteBlockers] = useState<Record<string, number> | null>(null);
  const [toggleTarget, setToggleTarget] = useState<any | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  }

  const { data: condominiums, isLoading } = useQuery({
    queryKey: ['condominiums'],
    queryFn: async () => {
      const res = await api.get('/condominiums');
      return res.data.data.condominiums as any[];
    },
  });

  const { data: availablePlans } = useQuery({
    queryKey: ['plans', { active: true }],
    queryFn: async () => {
      const r = await api.get('/plans?active=true');
      return r.data.data.plans as Array<{ id: string; slug: string; name: string; maxUnits: number; price: string | number; isActive: boolean }>;
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: ({ id, planSlug, maxUnits }: { id: string; planSlug: string; maxUnits?: number }) =>
      api.patch(`/condominiums/${id}/plan`, { planSlug, ...(maxUnits !== undefined ? { maxUnits } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setPlanTarget(null);
      setPlanToast('Plano atribuído com sucesso.');
      setTimeout(() => setPlanToast(null), 2500);
    },
    onError: (err: any) => {
      setPlanError(err?.response?.data?.message ?? 'Erro ao atribuir plano.');
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
    mutationFn: ({ condominiumId, ...d }: typeof adminForm & { condominiumId: string }) =>
      api.post(`/condominiums/${condominiumId}/setup-admin`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      // Fecha modal de criação (step 2)
      setShowModal(false);
      setCreateStep(1);
      setCreatedCondoId(null);
      setFormErrors({});
      setForm({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '', phone: '', email: '' });
      // Fecha modal de setup admin existente
      setShowSetupAdminModal(false);
      setSetupAdminTargetCondo(null);
      // Limpa form admin
      setAdminErrors({});
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

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/condominiums/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setToggleTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/condominiums/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      setDeleteTarget(null);
      setDeleteConfirmName('');
      setDeleteError('');
      setDeleteBlockers(null);
    },
    onError: (err: any) => {
      // Refresca contadores: o estado real pode ter mudado desde a abertura do modal.
      queryClient.invalidateQueries({ queryKey: ['condominiums'] });
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.data?.blockers) {
        setDeleteBlockers(data.data.blockers);
        setDeleteError(data.message || 'Condomínio possui vínculos.');
      } else {
        setDeleteError(data?.message || 'Erro ao excluir condomínio.');
      }
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

  const filtered = useMemo(() => {
    if (!condominiums) return [] as any[];
    const q = search.trim().toLowerCase();
    const list = condominiums.filter((c: any) => {
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;
      if (!q) return true;
      const hay = [c.name, c.cnpj, c.city, c.state, c.address, c.email]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const get = (c: any): string | number => {
      switch (sortKey) {
        case 'name': return (c.name ?? '').toLowerCase();
        case 'city': return (c.city ?? '').toLowerCase();
        case 'cnpj': return (c.cnpj ?? '').toLowerCase();
        case 'units': return c._count?.units ?? 0;
        case 'members': return c._count?.condominiumUsers ?? 0;
        case 'status': return c.isActive ? 1 : 0;
      }
    };
    return [...list].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [condominiums, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, CNPJ, cidade..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground sm:ml-auto">
          {filtered.length} de {condominiums?.length ?? 0}
        </div>
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
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <Search className="w-8 h-8" />
          <p className="text-sm">Nenhum condomínio encontrado para os filtros atuais</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Condomínio <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    <button onClick={() => toggleSort('city')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Localização <SortIcon k="city" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <button onClick={() => toggleSort('cnpj')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      CNPJ <SortIcon k="cnpj" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('units')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Unidades <SortIcon k="units" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    <button onClick={() => toggleSort('members')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Membros <SortIcon k="members" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Status <SortIcon k="status" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((c: any) => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 ${!c.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-blue-100 p-1.5 rounded-md shrink-0">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.name}</p>
                          {c.address && (
                            <p className="text-xs text-muted-foreground truncate md:hidden">{c.address}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {c.city ? `${c.city}${c.state ? ` - ${c.state}` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {c.cnpj || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Home className="w-3.5 h-3.5" /> {c._count?.units ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {c._count?.condominiumUsers ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Editar"
                          onClick={() => {
                            setEditForm({
                              name: c.name ?? '', address: c.address ?? '', city: c.city ?? '',
                              state: c.state ?? '', zipCode: c.zipCode ?? '', cnpj: c.cnpj ?? '',
                              phone: c.phone ?? '', email: c.email ?? '',
                            });
                            setEditTarget(c);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Senhas / Usuários"
                          onClick={() => { setMembersTarget(c); setShowMembersModal(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          title="Atribuir plano"
                          onClick={() => {
                            setPlanTarget(c);
                            setPlanForm({
                              planSlug: c.plan ?? '',
                              maxUnits: String(c.maxUnits ?? ''),
                              useDefault: false,
                            });
                            setPlanError('');
                          }}
                          className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          title={c.isActive ? 'Inativar' : 'Reativar'}
                          disabled={toggleActiveMutation.isPending && toggleTarget?.id === c.id}
                          onClick={() => setToggleTarget(c)}
                          className={`p-1.5 rounded hover:bg-amber-50 disabled:opacity-50 ${c.isActive ? 'text-amber-600' : 'text-green-600'}`}
                        >
                          {toggleActiveMutation.isPending && toggleTarget?.id === c.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          title="Excluir"
                          onClick={() => {
                            setDeleteTarget(c);
                            setDeleteConfirmName('');
                            setDeleteError('');
                            setDeleteBlockers(null);
                          }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-gray-600">
              <span>Página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
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
                      // Strip empty strings para não falhar validação de email/phone na API
                      const payload = Object.fromEntries(
                        Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v])
                      ) as typeof form;
                      createMutation.mutate(payload);
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
                      const targetId = createdCondoId ?? setupAdminTargetCondo?.id;
                      if (!targetId) return;
                      setupAdminMutation.mutate({ ...adminForm, condominiumId: targetId });
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

            <div className="border-b pb-3 mb-1">
              <button
                onClick={() => {
                  setSetupAdminTargetCondo(membersTarget);
                  setAdminForm({ name: '', email: '', password: '' });
                  setAdminErrors({});
                  setShowAdminPwd(false);
                  setShowSetupAdminModal(true);
                }}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <UserCog className="w-4 h-4" /> Criar / Definir Administrador
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

      {/* ── Setup Admin para condomínio existente ── */}
      {showSetupAdminModal && setupAdminTargetCondo && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Criar / Definir Administrador</h2>
            <p className="text-sm text-muted-foreground">
              Condomínio: <span className="font-medium">{setupAdminTargetCondo.name}</span>
            </p>
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
            {setupAdminMutation.isSuccess && (
              <p className="text-sm text-green-600">Administrador criado com sucesso!</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSetupAdminModal(false); setSetupAdminTargetCondo(null); setAdminForm({ name: '', email: '', password: '' }); setAdminErrors({}); }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  if (!adminForm.name || adminForm.name.length < 2) errs.name = 'Nome obrigatório (mín. 2 caracteres)';
                  if (!adminForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) errs.email = 'E-mail inválido';
                  if (!adminForm.password || adminForm.password.length < 6) errs.password = 'Senha deve ter pelo menos 6 caracteres';
                  if (Object.keys(errs).length) { setAdminErrors(errs); return; }
                  setAdminErrors({});
                  setupAdminMutation.mutate({ ...adminForm, condominiumId: setupAdminTargetCondo.id });
                }}
                disabled={setupAdminMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {setupAdminMutation.isPending ? 'Criando...' : 'Criar Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toggle Active Confirmation Modal ── */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${toggleTarget.isActive ? 'bg-amber-100' : 'bg-green-100'}`}>
                <Power className={`w-5 h-5 ${toggleTarget.isActive ? 'text-amber-600' : 'text-green-600'}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  {toggleTarget.isActive ? 'Inativar' : 'Reativar'} condomínio
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">{toggleTarget.name}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              {toggleTarget.isActive
                ? 'Moradores e funcionários perderão acesso ao condomínio até a reativação. As contagens e dados são preservados.'
                : 'O acesso de moradores e funcionários será restaurado.'}
            </p>
            {toggleActiveMutation.isError && (
              <p className="text-sm text-red-600">
                {(toggleActiveMutation.error as any)?.response?.data?.message
                  || 'Erro ao alterar status.'}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setToggleTarget(null)}
                disabled={toggleActiveMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleActiveMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive })}
                disabled={toggleActiveMutation.isPending}
                className={`flex-1 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  toggleTarget.isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {toggleActiveMutation.isPending
                  ? 'Salvando...'
                  : toggleTarget.isActive ? 'Inativar' : 'Reativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Excluir Condomínio</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta ação é <span className="font-semibold text-red-600">irreversível</span>. Para condomínios com histórico, prefira <span className="font-medium">inativar</span>.
                </p>
              </div>
            </div>

            {deleteBlockers ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-red-800">
                  Não é possível excluir — existem vínculos:
                </p>
                <ul className="text-xs text-red-700 list-disc pl-5 space-y-0.5">
                  {Object.entries(deleteBlockers).map(([k, v]) => {
                    const labels: Record<string, string> = {
                      units: 'unidade(s)',
                      condominiumUsers: 'membro(s)',
                      contracts: 'contrato(s)',
                      financialAccounts: 'conta(s) financeira(s)',
                      employees: 'funcionário(s)',
                      commonAreas: 'área(s) comum(ns)',
                      serviceProviders: 'prestador(es) de serviço',
                      announcements: 'comunicado(s)',
                      occurrences: 'ocorrência(s)',
                      polls: 'enquete(s)',
                      assemblies: 'assembleia(s)',
                      lostAndFoundItems: 'item(ns) achados e perdidos',
                      documents: 'documento(s)',
                      panicAlerts: 'alerta(s) de pânico',
                      visitorRecurrences: 'recorrência(s) de visita',
                      chatConversations: 'conversa(s) de chat',
                      maintenanceSchedules: 'agendamento(s) de manutenção',
                      foreignKey: 'registro(s) vinculado(s) (FK)',
                    };
                    return (
                      <li key={k}>
                        <span className="font-semibold">{v}</span>{' '}
                        {labels[k] ?? k}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-red-700 pt-1">
                  Remova os vínculos ou inative o condomínio.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  Para confirmar, digite o nome exato do condomínio:
                </p>
                <p className="text-sm font-mono bg-gray-100 rounded px-2 py-1">{deleteTarget.name}</p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Digite o nome do condomínio"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {deleteError && (
                  <p className="text-xs text-red-600">{deleteError}</p>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmName('');
                  setDeleteError('');
                  setDeleteBlockers(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              {!deleteBlockers && (
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={
                    deleteConfirmName.trim() !== deleteTarget.name ||
                    deleteMutation.isPending
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </div>
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

      {/* Modal Atribuir plano */}
      {planTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Atribuir plano
              </h2>
              <button
                onClick={() => setPlanTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Condomínio: <span className="font-medium text-gray-800">{planTarget.name}</span>
              </p>

              <div className="space-y-1">
                <label className="text-sm font-medium">Plano</label>
                <select
                  value={planForm.planSlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    const p = availablePlans?.find((x) => x.slug === slug);
                    setPlanForm((f) => ({
                      ...f,
                      planSlug: slug,
                      maxUnits: f.useDefault && p ? String(p.maxUnits) : f.maxUnits,
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione…</option>
                  {(availablePlans ?? []).map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name} ({p.slug}) — até {p.maxUnits.toLocaleString('pt-BR')} unidades
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={planForm.useDefault}
                  onChange={(e) => {
                    const useDefault = e.target.checked;
                    const p = availablePlans?.find((x) => x.slug === planForm.planSlug);
                    setPlanForm((f) => ({
                      ...f,
                      useDefault,
                      maxUnits: useDefault && p ? String(p.maxUnits) : f.maxUnits,
                    }));
                  }}
                />
                Usar limite padrão do plano
              </label>

              <div className="space-y-1">
                <label className="text-sm font-medium">Limite de unidades</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={planForm.maxUnits}
                  disabled={planForm.useDefault}
                  onChange={(e) => setPlanForm((f) => ({ ...f, maxUnits: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-muted-foreground">
                  Marque "Usar limite padrão" para herdar o valor do plano. Desmarque para
                  sobrescrever apenas neste condomínio.
                </p>
              </div>

              {planError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg">
                  {planError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setPlanTarget(null)}
                className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setPlanError('');
                  if (!planForm.planSlug) {
                    setPlanError('Selecione um plano.');
                    return;
                  }
                  const payload: { id: string; planSlug: string; maxUnits?: number } = {
                    id: planTarget.id,
                    planSlug: planForm.planSlug,
                  };
                  if (!planForm.useDefault) {
                    const mu = parseInt(planForm.maxUnits, 10);
                    if (!Number.isFinite(mu) || mu <= 0) {
                      setPlanError('Informe um limite de unidades válido.');
                      return;
                    }
                    payload.maxUnits = mu;
                  }
                  assignPlanMutation.mutate(payload);
                }}
                disabled={assignPlanMutation.isPending}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {assignPlanMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Atribuir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast atribuição de plano */}
      {planToast && (
        <div className="fixed top-4 right-4 z-[80]">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border bg-green-50 border-green-200 text-green-800 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            {planToast}
          </div>
        </div>
      )}
    </div>
  );
}
