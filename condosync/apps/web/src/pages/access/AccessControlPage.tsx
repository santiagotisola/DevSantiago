import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  Lock, UserCog, Users, CheckCircle2, XCircle, Loader2,
  ToggleLeft, ToggleRight, Info,
  Plus, Save, Edit2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { validateEmail } from '../../lib/utils';

// ─── Módulos disponíveis no sistema ─────────────────────────
const ALL_MODULES = [
  { key: 'dashboard',         label: 'Dashboard',              desc: 'Visão geral com indicadores do condomínio' },
  { key: 'portaria',          label: 'Portaria',               desc: 'Controle de visitantes, encomendas e veículos' },
  { key: 'moradores',         label: 'Moradores',              desc: 'Cadastro e consulta de moradores' },
  { key: 'unidades',          label: 'Unidades',               desc: 'Gestão de unidades e lotes' },
  { key: 'pets',              label: 'Pets',                   desc: 'Cadastro de animais de estimação' },
  { key: 'financeiro',        label: 'Financeiro',             desc: 'Lançamentos, cobranças e relatórios financeiros' },
  { key: 'cobrancas_morador', label: 'Cobranças (morador)',    desc: 'Visualização das cobranças da unidade' },
  { key: 'manutencao',        label: 'Manutenção',             desc: 'Ordens de serviço e manutenção predial' },
  { key: 'areas_comuns',      label: 'Áreas Comuns',           desc: 'Reservas de salão, churrasqueira, etc.' },
  { key: 'avisos',            label: 'Avisos',                 desc: 'Comunicados e notificações para moradores' },
  { key: 'ocorrencias',       label: 'Ocorrências',            desc: 'Registro de ocorrências e incidentes' },
  { key: 'achados_perdidos',  label: 'Achados e Perdidos',     desc: 'Gerenciamento de objetos perdidos' },
  { key: 'assembleias',       label: 'Assembleias',            desc: 'Pautas, votações e assembleias virtuais' },
  { key: 'documentos',        label: 'Documentos',             desc: 'Repositório de documentos do condomínio' },
  { key: 'chamados',          label: 'Chamados',               desc: 'Abertura e acompanhamento de chamados' },
  { key: 'galeria',           label: 'Galeria',                desc: 'Fotos e imagens do condomínio' },
  { key: 'estoque',           label: 'Estoque',                desc: 'Controle de materiais e suprimentos' },
  { key: 'obras',             label: 'Obras',                  desc: 'Acompanhamento de obras e reformas' },
  { key: 'relatorios',        label: 'Relatórios',             desc: 'Geração de relatórios gerenciais' },
  { key: 'funcionarios',      label: 'Funcionários',           desc: 'Cadastro e gestão de funcionários' },
  { key: 'prestadores',       label: 'Prestadores',            desc: 'Cadastro de prestadores de serviço' },
  { key: 'minha_portaria',    label: 'Minha Portaria',         desc: 'Portal do morador para visitas e obras' },
  { key: 'acesso',            label: 'Controle de Acesso',     desc: 'Gerenciamento de perfis e permissões' },
];

interface Profile {
  key: string;
  label: string;
  color: string;
  border: string;
  dot: string;
  desc: string;
  modules: string[];
}

// ─── Perfis do sistema com seus módulos ─────────────────────
const PROFILES: Profile[] = [
  {
    key: 'CONDOMINIUM_ADMIN',
    label: 'Administrador',
    color: 'bg-purple-100 text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    desc: 'Acesso total ao sistema. Gerencia funcionários, finanças, moradores e todas as configurações.',
    modules: ['dashboard','portaria','moradores','unidades','pets','financeiro','manutencao','areas_comuns','avisos','ocorrencias','achados_perdidos','assembleias','documentos','chamados','galeria','estoque','obras','relatorios','funcionarios','prestadores','acesso'],
  },
  {
    key: 'SYNDIC',
    label: 'Síndico',
    color: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    desc: 'Acesso completo de gestão operacional: portaria, finanças, comunicação e relatórios.',
    modules: ['dashboard','portaria','moradores','unidades','pets','financeiro','manutencao','areas_comuns','avisos','ocorrencias','achados_perdidos','assembleias','documentos','chamados','galeria','estoque','obras','relatorios','funcionarios','prestadores','acesso'],
  },
  {
    key: 'DOORMAN',
    label: 'Porteiro',
    color: 'bg-orange-100 text-orange-800',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    desc: 'Acesso focado em portaria: controla visitantes, encomendas, veículos e consulta moradores.',
    modules: ['dashboard','portaria','moradores','avisos','ocorrencias','chamados'],
  },
  {
    key: 'COUNCIL_MEMBER',
    label: 'Conselheiro',
    color: 'bg-teal-100 text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    desc: 'Acesso de acompanhamento: assembleias, comunicados, documentos e áreas comuns.',
    modules: ['dashboard','areas_comuns','avisos','ocorrencias','assembleias','documentos','chamados','galeria'],
  },
  {
    key: 'RESIDENT',
    label: 'Morador',
    color: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
    desc: 'Portal do morador: visitas, cobranças, reservas de áreas, chamados e comunicados.',
    modules: ['dashboard','cobrancas_morador','areas_comuns','avisos','ocorrencias','achados_perdidos','documentos','chamados','galeria','minha_portaria'],
  },
  {
    key: 'SERVICE_PROVIDER',
    label: 'Prestador de Serviço',
    color: 'bg-pink-100 text-pink-800',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    desc: 'Acesso restrito a avisos e chamados relacionados aos seus serviços prestados.',
    modules: ['dashboard','avisos','chamados'],
  },
];

type Tab = 'permissions' | 'profiles' | 'users';

export default function AccessControlPage() {
  const { selectedCondominiumId } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('permissions');
  const [selectedProfile, setSelectedProfile] = useState<Profile>(PROFILES[2]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [editModal, setEditModal] = useState<{ open: boolean; member: any | null }>({ open: false, member: null });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', unitId: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '', email: '', phone: '', password: '', systemRole: 'DOORMAN',
  });
  const [newUserErrors, setNewUserErrors] = useState<Record<string, string>>({});

  // ── Fetch membros ──────────────────────────────────────────
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['access-members', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/permissions/condominium/${selectedCondominiumId}/members`);
      return res.data.data.members as any[];
    },
    enabled: !!selectedCondominiumId && tab === 'users',
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units-list', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as any[];
    },
    enabled: !!selectedCondominiumId && tab === 'users',
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      api.patch(`/permissions/condominium/${selectedCondominiumId}/members/${userId}/update`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-members'] });
      setEditModal({ open: false, member: null });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao salvar';
      setEditErrors({ general: msg });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/permissions/condominium/${selectedCondominiumId}/members/${userId}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-members'] }),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof newUserForm) =>
      api.post('/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.systemRole,
        condominiumId: selectedCondominiumId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-members'] });
      setShowNewUser(false);
      setNewUserForm({ name: '', email: '', phone: '', password: '', systemRole: 'DOORMAN' });
      setNewUserErrors({});
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erro ao criar usuário';
      setNewUserErrors({ general: msg });
    },
  });

  const members = (membersData ?? []).filter(
    (m: any) => roleFilter === 'all' || m.role === roleFilter,
  );

  const TABS = [
    { key: 'permissions' as Tab, icon: Lock,    label: 'Permissões de Acesso', desc: 'Módulos e janelas do sistema' },
    { key: 'profiles'    as Tab, icon: UserCog, label: 'Perfis de Acesso',     desc: 'O que cada perfil pode acessar' },
    { key: 'users'       as Tab, icon: Users,   label: 'Usuários',             desc: 'Vincule usuários a perfis' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Controle de Acesso</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure permissões, perfis e usuários do condomínio</p>
      </div>

      {/* Tabs — cards clicáveis */}
      <div className="grid grid-cols-3 gap-3">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50',
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-blue-500')} />
              <div className="min-w-0">
                <p className={cn('font-semibold text-sm', active ? 'text-white' : 'text-gray-800')}>{t.label}</p>
                <p className={cn('text-xs mt-0.5 truncate', active ? 'text-blue-100' : 'text-muted-foreground')}>{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB 1 — PERMISSÕES DE ACESSO
          Lista todos os módulos/janelas disponíveis
      ═══════════════════════════════════════════════════ */}
      {tab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              Todos os módulos e janelas disponíveis no CondoSync.
              Acesse <strong>Perfis de Acesso</strong> para ver quais estão liberados por perfil.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{ALL_MODULES.length} módulos disponíveis</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">CondoSync v1.0</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_MODULES.map((mod, i) => (
              <div
                key={mod.key}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3 hover:border-blue-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-800">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {PROFILES.filter(p => p.modules.includes(mod.key)).map(p => (
                      <span key={p.key} className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', p.color)}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 2 — PERFIS DE ACESSO
          Seletor lateral + detalhe com checkboxes
      ═══════════════════════════════════════════════════ */}
      {tab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              Selecione um perfil para ver seus módulos configurados.
              Para alterar o perfil de um usuário, acesse a aba <strong>Usuários</strong>.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {/* Lista lateral */}
            <div className="lg:col-span-1 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Perfis</p>
              {PROFILES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedProfile(p)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                    selectedProfile.key === p.key
                      ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                      : cn('bg-white hover:border-gray-400', p.border),
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full shrink-0', p.dot)} />
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold truncate', selectedProfile.key === p.key ? 'text-white' : 'text-gray-800')}>
                      {p.label}
                    </p>
                    <p className={cn('text-xs', selectedProfile.key === p.key ? 'text-gray-300' : 'text-muted-foreground')}>
                      {p.modules.length} módulos
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Detalhe do perfil */}
            <div className="lg:col-span-3 space-y-4">
              {/* Card cabeçalho */}
              <div className={cn('bg-white rounded-xl border p-5', selectedProfile.border)}>
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', selectedProfile.color)}>
                    <UserCog className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900">{selectedProfile.label}</h2>
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', selectedProfile.color)}>
                        {selectedProfile.modules.length} de {ALL_MODULES.length} módulos
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedProfile.desc}</p>
                  </div>
                </div>
                <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedProfile.modules.length}</p>
                    <p className="text-xs text-muted-foreground">Com acesso</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-300">{ALL_MODULES.length - selectedProfile.modules.length}</p>
                    <p className="text-xs text-muted-foreground">Bloqueados</p>
                  </div>
                </div>
              </div>

              {/* Lista com checkboxes */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700">
                    Janelas e módulos — <span className="font-bold">{selectedProfile.label}</span>
                  </p>
                </div>
                <div className="divide-y">
                  {ALL_MODULES.map(mod => {
                    const has = selectedProfile.modules.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        className={cn('flex items-center gap-4 px-4 py-3', has ? 'bg-white' : 'bg-gray-50 opacity-60')}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors',
                          has ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white',
                        )}>
                          {has && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', has ? 'text-gray-800' : 'text-gray-400')}>{mod.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{mod.desc}</p>
                        </div>
                        {has
                          ? <span className="text-xs text-green-600 font-medium shrink-0 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Liberado</span>
                          : <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1"><XCircle className="w-3 h-3" /> Bloqueado</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 3 — USUÁRIOS
          Cria usuário com perfil + gerencia membros
      ═══════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Filtros + botão novo */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRoleFilter('all')}
                className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                  roleFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}
              >
                Todos
              </button>
              {PROFILES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setRoleFilter(p.key)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                    roleFilter === p.key ? 'bg-gray-800 text-white border-gray-800' : cn('hover:opacity-80', p.color, p.border),
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewUser(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>

          {/* Modal: Novo Usuário */}
          {showNewUser && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Novo Usuário</h2>
                  <button onClick={() => { setShowNewUser(false); setNewUserErrors({}); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                {newUserErrors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {newUserErrors.general}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nome *</label>
                    <input
                      value={newUserForm.name}
                      onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      placeholder="Nome completo"
                      className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', newUserErrors.name ? 'border-red-400' : 'border-gray-300')}
                    />
                    {newUserErrors.name && <p className="text-xs text-red-500">{newUserErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">E-mail *</label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', newUserErrors.email ? 'border-red-400' : 'border-gray-300')}
                    />
                    {newUserErrors.email && <p className="text-xs text-red-500">{newUserErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Celular</label>
                    <input
                      value={newUserForm.phone}
                      onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      placeholder="(62) 99999-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Senha inicial *</label>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                      className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', newUserErrors.password ? 'border-red-400' : 'border-gray-300')}
                    />
                    {newUserErrors.password && <p className="text-xs text-red-500">{newUserErrors.password}</p>}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Perfil de acesso *</label>
                    <select
                      aria-label="Perfil de acesso"
                      value={newUserForm.systemRole}
                      onChange={e => setNewUserForm({ ...newUserForm, systemRole: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PROFILES.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview do perfil selecionado */}
                  {(() => {
                    const p = PROFILES.find(x => x.key === newUserForm.systemRole);
                    return p ? (
                      <div className={cn('col-span-2 rounded-xl border p-3 flex items-start gap-3', p.border)}>
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold', p.color)}>
                          {p.modules.length}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                          <p className="text-xs text-gray-500">{p.desc}</p>
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            Acesso a {p.modules.length} módulo{p.modules.length !== 1 ? 's' : ''} do sistema
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowNewUser(false); setNewUserErrors({}); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const errs: Record<string, string> = {};
                      if (!newUserForm.name.trim()) errs.name = 'Nome obrigatório';
                      const emailErr = validateEmail(newUserForm.email);
                      if (!newUserForm.email) errs.email = 'E-mail obrigatório';
                      else if (emailErr) errs.email = emailErr;
                      if (!newUserForm.password || newUserForm.password.length < 8) errs.password = 'Mínimo 8 caracteres';
                      if (Object.keys(errs).length) { setNewUserErrors(errs); return; }
                      setNewUserErrors({});
                      createUserMutation.mutate(newUserForm);
                    }}
                    disabled={createUserMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {createUserMutation.isPending ? 'Salvando...' : 'Salvar usuário'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Editar Usuário */}
          {editModal.open && editModal.member && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Editar Usuário</h2>
                  <button onClick={() => setEditModal({ open: false, member: null })} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                {editErrors.general && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {editErrors.general}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nome *</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Nome completo"
                      className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', editErrors.name ? 'border-red-400' : 'border-gray-300')}
                    />
                    {editErrors.name && <p className="text-xs text-red-500">{editErrors.name}</p>}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-sm font-medium text-gray-700">E-mail *</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className={cn('w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', editErrors.email ? 'border-red-400' : 'border-gray-300')}
                    />
                    {editErrors.email && <p className="text-xs text-red-500">{editErrors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Perfil de acesso</label>
                    <select
                      aria-label="Perfil de acesso"
                      value={editForm.role}
                      onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PROFILES.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Unidade</label>
                    <select
                      aria-label="Unidade"
                      value={editForm.unitId}
                      onChange={e => setEditForm({ ...editForm, unitId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Sem unidade —</option>
                      {(unitsData ?? []).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.block ? `${u.block} — ${u.identifier}` : u.identifier}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setEditModal({ open: false, member: null }); setEditErrors({}); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const errs: Record<string, string> = {};
                      if (!editForm.name.trim()) errs.name = 'Nome obrigatório';
                      const emailErr = validateEmail(editForm.email);
                      if (!editForm.email) errs.email = 'E-mail obrigatório';
                      else if (emailErr) errs.email = emailErr;
                      if (Object.keys(errs).length) { setEditErrors(errs); return; }
                      setEditErrors({});
                      updateMemberMutation.mutate({
                        userId: editModal.member!.userId,
                        data: {
                          name: editForm.name,
                          email: editForm.email,
                          role: editForm.role,
                          unitId: editForm.unitId || null,
                        },
                      });
                    }}
                    disabled={updateMemberMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {updateMemberMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de membros */}
          {loadingMembers ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
              <Users className="w-10 h-10" />
              <p>Nenhum usuário encontrado</p>
              <button onClick={() => setShowNewUser(true)} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                <Plus className="w-3.5 h-3.5" /> Criar primeiro usuário
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">
                  {members.length} {members.length === 1 ? 'usuário' : 'usuários'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs text-gray-500 font-semibold">
                      <th className="text-left px-4 py-3">Usuário</th>
                      <th className="text-left px-4 py-3">Perfil de Acesso</th>
                      <th className="text-left px-4 py-3">Unidade</th>
                      <th className="text-left px-4 py-3">Último acesso</th>
                      <th className="text-center px-4 py-3">Ativo</th>
                      <th className="text-center px-4 py-3">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map((m: any) => {
                      return (
                        <tr key={m.id} className={cn('hover:bg-gray-50 transition-colors', !m.isActive && 'opacity-50')}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                {m.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 leading-tight">{m.user?.name ?? '—'}</p>
                                <p className="text-xs text-muted-foreground">{m.user?.email ?? '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const p = PROFILES.find(x => x.key === m.role);
                              return (
                                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', p?.color ?? 'bg-gray-100 text-gray-600')}>
                                  {p?.label ?? m.role}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {m.unit ? `${m.unit.block ? m.unit.block + ' — ' : ''}${m.unit.identifier}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {m.user?.lastLoginAt
                              ? new Date(m.user.lastLoginAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                              : <span className="text-amber-500 font-medium">Nunca acessou</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleMutation.mutate(m.userId)}
                              disabled={toggleMutation.isPending || m.user?.role === 'SUPER_ADMIN'}
                              title={m.isActive ? 'Clique para desativar' : 'Clique para ativar'}
                              className="disabled:opacity-40"
                            >
                              {m.isActive
                                ? <ToggleRight className="w-7 h-7 text-green-500" />
                                : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {m.user?.role !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => {
                                  setEditModal({ open: true, member: m });
                                  setEditForm({
                                    name: m.user?.name ?? '',
                                    email: m.user?.email ?? '',
                                    role: m.role,
                                    unitId: m.unit?.id ?? '',
                                  });
                                  setEditErrors({});
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1 mx-auto border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
