import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  UsersRound, PlusCircle, Search, Loader2, Pencil, Trash2, UserRoundPlus, X,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { maskPhone, validatePhone, maskCPF, validateCPF, validateEmail, validateName } from '../../lib/utils';

const emptyForm = { name: '', email: '', phone: '', cpf: '', unitId: '' };

type SortKey = 'name' | 'email' | 'joinedAt' | 'unit';
type Status = 'active' | 'inactive' | 'all';
type HasDeps = 'all' | 'yes' | 'no';

export function ResidentsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();

  // ── Filtros / paginação ────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status>('active');
  const [hasDepFilter, setHasDepFilter] = useState<HasDeps>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Debounce do campo de busca → search efetivo (300ms)
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset de página quando filtros mudam
  useEffect(() => { setPage(1); }, [unitFilter, statusFilter, hasDepFilter, sortKey, sortDir]);

  // ── Modais ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [depTarget, setDepTarget] = useState<any>(null);
  const [drawerTarget, setDrawerTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ name: '', phone: '', cpf: '', unitId: '' });
  const [depForm, setDepForm] = useState({ name: '', relationship: '', cpf: '', birthDate: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['residents', selectedCondominiumId, { page, search, unitFilter, statusFilter, hasDepFilter, sortKey, sortDir }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status: statusFilter,
        hasDependents: hasDepFilter,
        sortKey,
        sortDir,
      };
      if (search) params.search = search;
      if (unitFilter) params.unitId = unitFilter;
      const res = await api.get(`/residents/condominium/${selectedCondominiumId}`, { params });
      return res.data.data as {
        residents: any[];
        pagination: { total: number; page: number; pageSize: number; totalPages: number };
      };
    },
    enabled: !!selectedCondominiumId,
    placeholderData: keepPreviousData,
  });

  const residents = data?.residents ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Lista de unidades — carrega sempre que tem condomínio (usada no filtro e nos modais)
  const { data: units } = useQuery({
    queryKey: ['units', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units;
    },
    enabled: !!selectedCondominiumId,
  });

  // Mantém o drawer sincronizado com a lista atualizada (ex: após adicionar dependente)
  useEffect(() => {
    if (!drawerTarget) return;
    const fresh = residents.find((r: any) => r.id === drawerTarget.id);
    if (fresh) setDrawerTarget(fresh);
  }, [residents]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/residents', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setShowModal(false);
      setForm({ ...emptyForm });
      setCreateErrors({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.patch(`/residents/${editTarget.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setEditTarget(null);
      setEditErrors({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/residents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setDeleteTarget(null);
      setDrawerTarget(null);
    },
  });

  const addDepMutation = useMutation({
    mutationFn: (d: typeof depForm) => api.post('/residents/dependents', {
      ...d,
      unitId: depTarget?.unit?.id,
      birthDate: d.birthDate ? new Date(d.birthDate).toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setDepTarget(null);
      setDepForm({ name: '', relationship: '', cpf: '', birthDate: '' });
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: (depId: string) => api.delete(`/residents/dependents/${depId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residents'] }),
  });

  const openEdit = (r: any) => {
    setEditForm({ name: r.user?.name ?? '', phone: r.user?.phone ?? '', cpf: r.user?.cpf ?? '', unitId: r.unit?.id ?? '' });
    setEditTarget(r);
  };

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moradores</h1>
          <p className="text-muted-foreground">Gerenciamento de moradores e dependentes</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <PlusCircle className="w-4 h-4" />
            Novo Morador
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, email, telefone, CPF, unidade..."
            className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
          )}
        </div>

        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as unidades</option>
          {((units || []) as any[]).map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.identifier}{u.block ? ` / Bloco ${u.block}` : ''}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>

        <select
          value={hasDepFilter}
          onChange={(e) => setHasDepFilter(e.target.value as HasDeps)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Com/sem dependentes</option>
          <option value="yes">Com dependentes</option>
          <option value="no">Sem dependentes</option>
        </select>

        <div className="text-xs text-muted-foreground lg:ml-auto whitespace-nowrap">
          {total} morador{total === 1 ? '' : 'es'}
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : residents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <UsersRound className="w-10 h-10" />
          <p>Nenhum morador encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Morador <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    <button onClick={() => toggleSort('email')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Contato <SortIcon k="email" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('unit')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Unidade <SortIcon k="unit" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Dep.</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <button onClick={() => toggleSort('joinedAt')} className="inline-flex items-center gap-1 hover:text-gray-800">
                      Vínculo <SortIcon k="joinedAt" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {residents.map((r: any) => (
                  <tr
                    key={r.id}
                    onClick={() => setDrawerTarget(r)}
                    className={`cursor-pointer hover:bg-blue-50/40 ${!r.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs shrink-0">
                          {r.user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.user?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground truncate md:hidden">{r.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="truncate text-gray-700">{r.user?.email || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.user?.phone || ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.unit ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {r.unit.identifier}{r.unit.block ? ` / ${r.unit.block}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {r.unit?.dependents?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button
                              title="Editar"
                              onClick={() => openEdit(r)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {r.unit && (
                              <button
                                title="Adicionar dependente"
                                onClick={() => setDepTarget(r)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                              >
                                <UserRoundPlus className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              title="Remover do condomínio"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-gray-600">
              <span>Página {page} de {totalPages} · {total} resultados</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawer de detalhes */}
      {drawerTarget && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setDrawerTarget(null)}>
          <div className="flex-1 bg-black/40" />
          <div
            className="w-full max-w-md bg-white h-full shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold">Detalhes do morador</h2>
              <button
                onClick={() => setDrawerTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                  {drawerTarget.user?.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{drawerTarget.user?.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{drawerTarget.user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p>{drawerTarget.user?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p>{drawerTarget.user?.cpf || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p>
                    {drawerTarget.unit
                      ? `${drawerTarget.unit.identifier}${drawerTarget.unit.block ? ` / Bloco ${drawerTarget.unit.block}` : ''}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vinculado em</p>
                  <p>{drawerTarget.joinedAt ? new Date(drawerTarget.joinedAt).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Dependentes</p>
                  {isAdmin && drawerTarget.unitId && (
                    <button
                      onClick={() => setDepTarget(drawerTarget)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <UserRoundPlus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
                {drawerTarget.unit?.dependents?.length > 0 ? (
                  <ul className="space-y-1">
                    {drawerTarget.unit.dependents.map((d: any) => (
                      <li key={d.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                        <span>
                          {d.name}{' '}
                          <span className="text-xs text-gray-400">({d.relationship})</span>
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => removeDepMutation.mutate(d.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum dependente</p>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => { openEdit(drawerTarget); setDrawerTarget(null); }}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-white border rounded-lg hover:bg-gray-100 text-gray-700"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(drawerTarget); }}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover do condomínio
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Morador */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Morador</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.name ? 'border-red-400' : ''}`}
                />
                {createErrors.name && <p className="text-xs text-red-500 mt-0.5">{createErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.email ? 'border-red-400' : ''}`}
                />
                {createErrors.email && <p className="text-xs text-red-500 mt-0.5">{createErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-9999"
                />
                {createErrors.phone && <p className="text-xs text-red-500 mt-0.5">{createErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.cpf ? 'border-red-400' : ''}`}
                  placeholder="000.000.000-00"
                />
                {createErrors.cpf && <p className="text-xs text-red-500 mt-0.5">{createErrors.cpf}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Selecione uma unidade...</option>
                  {((units || []) as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.identifier}{u.block ? ' / Bloco ' + u.block : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            {createMutation.isError && <p className="text-sm text-red-600">Erro ao cadastrar. Verifique os dados.</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); setCreateErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(form.name); if (nameErr) errs.name = nameErr;
                  const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr;
                  const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr;
                  const cpfErr = validateCPF(form.cpf); if (cpfErr) errs.cpf = cpfErr;
                  if (Object.keys(errs).length) { setCreateErrors(errs); return; }
                  setCreateErrors({});
                  createMutation.mutate(form);
                }}
                disabled={!form.name || !form.email || !form.unitId || createMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
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
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome completo</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.name ? 'border-red-400' : ''}`}
                />
                {editErrors.name && <p className="text-xs text-red-500 mt-0.5">{editErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-9999"
                />
                {editErrors.phone && <p className="text-xs text-red-500 mt-0.5">{editErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CPF</label>
                <input
                  type="text"
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({ ...editForm, cpf: maskCPF(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.cpf ? 'border-red-400' : ''}`}
                  placeholder="000.000.000-00"
                />
                {editErrors.cpf && <p className="text-xs text-red-500 mt-0.5">{editErrors.cpf}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select value={editForm.unitId} onChange={(e) => setEditForm({ ...editForm, unitId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Selecione uma unidade...</option>
                  {((units || []) as any[]).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.identifier}{u.block ? ' / Bloco ' + u.block : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditTarget(null); setEditErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(editForm.name); if (nameErr) errs.name = nameErr;
                  const phoneErr = validatePhone(editForm.phone); if (phoneErr) errs.phone = phoneErr;
                  const cpfErr = validateCPF(editForm.cpf); if (cpfErr) errs.cpf = cpfErr;
                  if (Object.keys(errs).length) { setEditErrors(errs); return; }
                  setEditErrors({});
                  updateMutation.mutate(editForm);
                }}
                disabled={!editForm.unitId || updateMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 my-auto">
            <div>
              <h2 className="text-lg font-semibold">Adicionar Dependente</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Dependente de: <span className="font-medium text-gray-800">{depTarget.user?.name}</span></p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={depForm.name}
                  onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Parentesco *</label>
                <select
                  value={depForm.relationship}
                  onChange={(e) => setDepForm({ ...depForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Selecionar...</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Enteado(a)">Enteado(a)</option>
                  <option value="Pai">Pai</option>
                  <option value="Mãe">Mãe</option>
                  <option value="Irmão(ã)">Irmão(ã)</option>
                  <option value="Avô/Avó">Avô/Avó</option>
                  <option value="Neto(a)">Neto(a)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={depForm.cpf}
                    onChange={(e) => setDepForm({ ...depForm, cpf: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data de Nascimento</label>
                  <input
                    type="date"
                    value={depForm.birthDate}
                    onChange={(e) => setDepForm({ ...depForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            {addDepMutation.isError && <p className="text-sm text-red-600">Erro ao adicionar dependente. Tente novamente.</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDepTarget(null); setDepForm({ name: '', relationship: '', cpf: '', birthDate: '' }); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
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
