import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { HardHat, Plus, Search, Loader2, Mail, Phone, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { maskPhone, validatePhone, validateEmail, validateName } from '../../lib/utils';

export function EmployeesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '', shiftType: 'MORNING' });
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', email: '', phone: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [accessModal, setAccessModal] = useState(false);
  const [accessTarget, setAccessTarget] = useState<any | null>(null);
  const [accessForm, setAccessForm] = useState({ email: '', password: '', systemRole: 'DOORMAN' });
  const [accessErrors, setAccessErrors] = useState<Record<string, string>>({});
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/employees/condominium/${selectedCondominiumId}`); return res.data.data.employees; },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/employees', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setShowModal(false); setForm({ name: '', role: '', email: '', phone: '', shiftType: 'MORNING' }); setCreateErrors({}); },
    onError: (err: any) => { const msg = err?.response?.data?.message ?? 'Erro ao cadastrar funcionário'; setCreateErrors({ general: msg }); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.put(`/employees/${editTarget?.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditModal(false);
      setEditTarget(null);
      setEditErrors({});
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const grantAccessMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof accessForm }) =>
      api.post(`/employees/${id}/grant-access`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setAccessModal(false);
      setAccessTarget(null);
      setAccessForm({ email: '', password: '', systemRole: 'DOORMAN' });
      setAccessErrors({});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao vincular acesso';
      setAccessErrors({ general: msg });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}/revoke-access`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const shiftLabels: Record<string, string> = { MORNING: 'Manhã', AFTERNOON: 'Tarde', NIGHT: 'Noite', FULL_DAY: 'Integral' };

  const filtered = ((employees || []) as any[]).filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">Cadastro e gerenciamento de funcionários</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Funcionário
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar funcionários..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border"><HardHat className="w-10 h-10" /><p>Nenhum funcionário cadastrado</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e: any) => (
            <div key={e.id} className={`bg-white rounded-xl border p-4 ${!e.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold">{e.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-sm">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.role}</p>
                  </div>
                </div>
                {!e.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {e.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{e.email}</p>}
                {e.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{e.phone}</p>}
                {e.shift && <p>Turno: {shiftLabels[e.shift] || e.shift}</p>}
                {e.user ? (
                  <p className="flex items-center gap-1.5 text-green-600 font-medium">
                    <ShieldCheck className="w-3 h-3" />Acesso ativo — {e.user.email}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-amber-600">
                    <ShieldOff className="w-3 h-3" />Sem acesso ao sistema
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="mt-3 flex flex-col gap-1 text-xs">
                  {e.isActive && (
                    <button
                      onClick={() => {
                        setEditForm({
                          name: e.name ?? '',
                          role: e.role ?? '',
                          email: e.email ?? '',
                          phone: e.phone ?? '',
                        });
                        setEditTarget(e);
                        setEditModal(true);
                      }}
                      className="w-full border rounded-lg py-1 hover:bg-gray-50 text-gray-700"
                    >
                      Editar
                    </button>
                  )}
                  {e.isActive && !e.user && (
                    <button
                      onClick={() => {
                        setAccessForm({ email: e.email ?? '', password: '', systemRole: 'DOORMAN' });
                        setAccessTarget(e);
                        setAccessModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-1 border border-blue-300 text-blue-700 hover:bg-blue-50 py-1 rounded-lg"
                    >
                      <KeyRound className="w-3 h-3" /> Vincular Acesso
                    </button>
                  )}
                  {e.isActive && e.user && (
                    <button
                      onClick={() => revokeAccessMutation.mutate(e.id)}
                      disabled={revokeAccessMutation.isPending}
                      className="w-full flex items-center justify-center gap-1 border border-amber-300 text-amber-700 hover:bg-amber-50 py-1 rounded-lg disabled:opacity-50"
                    >
                      <ShieldOff className="w-3 h-3" /> Revogar Acesso
                    </button>
                  )}
                  {e.isActive && (
                    <button
                      onClick={() => deactivateMutation.mutate(e.id)}
                      className="w-full text-red-600 border border-red-200 hover:bg-red-50 py-1 rounded-lg"
                    >
                      Desativar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Funcionário</h2>
            {createErrors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{createErrors.general}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.name ? 'border-red-400' : ''}`}
                />
                {createErrors.name && <p className="text-xs text-red-500 mt-0.5">{createErrors.name}</p>}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Cargo *</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail</label>
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
                  placeholder="(11) 99999-0000"
                />
                {createErrors.phone && <p className="text-xs text-red-500 mt-0.5">{createErrors.phone}</p>}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Turno</label>
                <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="MORNING">Manhã</option>
                  <option value="AFTERNOON">Tarde</option>
                  <option value="NIGHT">Noite</option>
                  <option value="FULL_DAY">Integral</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setCreateErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(form.name); if (nameErr) errs.name = nameErr;
                  const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr;
                  const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr;
                  if (Object.keys(errs).length) { setCreateErrors(errs); return; }
                  setCreateErrors({});
                  createMutation.mutate(form);
                }}
                disabled={!form.name || !form.role || createMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Funcionário</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.name ? 'border-red-400' : ''}`}
                />
                {editErrors.name && <p className="text-xs text-red-500 mt-0.5">{editErrors.name}</p>}
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Cargo *</label>
                <input
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.email ? 'border-red-400' : ''}`}
                />
                {editErrors.email && <p className="text-xs text-red-500 mt-0.5">{editErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-0000"
                />
                {editErrors.phone && <p className="text-xs text-red-500 mt-0.5">{editErrors.phone}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditModal(false); setEditTarget(null); setEditErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(editForm.name); if (nameErr) errs.name = nameErr;
                  const emailErr = validateEmail(editForm.email); if (emailErr) errs.email = emailErr;
                  const phoneErr = validatePhone(editForm.phone); if (phoneErr) errs.phone = phoneErr;
                  if (Object.keys(errs).length) { setEditErrors(errs); return; }
                  setEditErrors({});
                  updateMutation.mutate(editForm);
                }}
                disabled={updateMutation.isPending || !editForm.name || !editForm.role}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {accessModal && accessTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Vincular Acesso ao Sistema</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Funcionário: <span className="font-medium text-gray-800">{accessTarget.name}</span>
              </p>
            </div>
            {accessErrors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {accessErrors.general}
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mail de acesso *</label>
                <input
                  type="email"
                  value={accessForm.email}
                  onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${accessErrors.email ? 'border-red-400' : ''}`}
                />
                {accessErrors.email && <p className="text-xs text-red-500">{accessErrors.email}</p>}
                <p className="text-xs text-muted-foreground">Se o e-mail já existir no sistema, a conta será vinculada sem criar nova.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Senha inicial *</label>
                <input
                  type="password"
                  value={accessForm.password}
                  onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${accessErrors.password ? 'border-red-400' : ''}`}
                />
                {accessErrors.password && <p className="text-xs text-red-500">{accessErrors.password}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Perfil de acesso *</label>
                <select
                  value={accessForm.systemRole}
                  onChange={(e) => setAccessForm({ ...accessForm, systemRole: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DOORMAN">Porteiro</option>
                  <option value="SYNDIC">Síndico</option>
                  <option value="CONDOMINIUM_ADMIN">Administrador</option>
                  <option value="COUNCIL_MEMBER">Conselheiro</option>
                  <option value="SERVICE_PROVIDER">Prestador de Serviço</option>
                </select>
                <p className="text-xs text-muted-foreground">Define quais menus e funcionalidades o colaborador poderá acessar.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setAccessModal(false); setAccessTarget(null); setAccessErrors({}); }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const emailErr = validateEmail(accessForm.email);
                  if (!accessForm.email) errs.email = 'E-mail obrigatório';
                  else if (emailErr) errs.email = emailErr;
                  if (!accessForm.password || accessForm.password.length < 8) errs.password = 'Senha deve ter pelo menos 8 caracteres';
                  if (Object.keys(errs).length) { setAccessErrors(errs); return; }
                  setAccessErrors({});
                  grantAccessMutation.mutate({ id: accessTarget.id, data: accessForm });
                }}
                disabled={grantAccessMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {grantAccessMutation.isPending ? 'Vinculando...' : 'Vincular Acesso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
