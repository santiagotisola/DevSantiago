import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Briefcase, Plus, Search, Loader2, CheckCircle, Mail, Phone } from 'lucide-react';
import { maskPhone, validatePhone, validateEmail, validateName, maskCPF, maskCNPJ } from '../../lib/utils';

export function ServiceProvidersPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', serviceType: '', email: '', phone: '', cnpj: '' });
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', serviceType: '', email: '', phone: '', cnpj: '' });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['service-providers', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/service-providers/condominium/${selectedCondominiumId}`); return res.data.data.providers; },
    enabled: !!selectedCondominiumId,
  });

  const maskCnpjCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length <= 11 ? maskCPF(value) : maskCNPJ(value);
  };

  const sanitize = (d: typeof form) => ({
    name: d.name,
    serviceType: d.serviceType,
    phone: d.phone || undefined,
    email: d.email || undefined,
    cnpj: d.cnpj || undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/service-providers', { ...sanitize(d), condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-providers'] }); setShowModal(false); setForm({ name: '', serviceType: '', email: '', phone: '', cnpj: '' }); setCreateErrors({}); },
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof editForm) => api.put(`/service-providers/${editTarget?.id}`, sanitize(d)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
      setEditModal(false);
      setEditTarget(null);
      setEditErrors({});
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/service-providers/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-providers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/service-providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
    },
  });
  const filtered = ((providers || []) as any[]).filter((p: any) =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase()) || (p.serviceType ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prestadores de Serviço</h1>
          <p className="text-muted-foreground">Cadastro de prestadores e empresas parceiras</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Prestador
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar prestadores..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border"><Briefcase className="w-10 h-10" /><p>Nenhum prestador cadastrado</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.serviceType && <p className="text-xs text-muted-foreground">{p.serviceType}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {p.isApproved ? 'Aprovado' : 'Pendente'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {p.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{p.email}</p>}
                {p.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{p.phone}</p>}
                {p.cnpj && <p>CNPJ: {p.cnpj}</p>}
              </div>
              {isAdmin && (
                <div className="mt-3 flex flex-col gap-1 text-xs">
                  <button
                    onClick={() => {
                      setEditForm({
                        name: p.name ?? '',
                        serviceType: p.serviceType ?? '',
                        email: p.email ?? '',
                        phone: p.phone ?? '',
                        cnpj: p.cnpj ?? '',
                      });
                      setEditTarget(p);
                      setEditModal(true);
                    }}
                    className="w-full border rounded-lg py-1 hover:bg-gray-50 text-gray-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="w-full text-red-600 border border-red-200 hover:bg-red-50 py-1 rounded-lg"
                  >
                    Excluir
                  </button>
                  {!p.isApproved && (
                    <button
                      onClick={() => approveMutation.mutate(p.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-green-700 border border-green-200 hover:bg-green-50 py-1.5 rounded-lg font-medium"
                    >
                      <CheckCircle className="w-3 h-3" /> Aprovar
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
            <h2 className="text-lg font-semibold">Novo Prestador de Serviço</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome/Empresa *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.name ? 'border-red-400' : ''}`}
                />
                {createErrors.name && <p className="text-xs text-red-500 mt-0.5">{createErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de Serviço *</label>
                <input
                  value={form.serviceType}
                  onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.serviceType ? 'border-red-400' : ''}`}
                />
                {createErrors.serviceType && <p className="text-xs text-red-500 mt-0.5">{createErrors.serviceType}</p>}
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
                <label className="text-sm font-medium">Telefone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${createErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-0000"
                />
                {createErrors.phone && <p className="text-xs text-red-500 mt-0.5">{createErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CNPJ/CPF</label>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: maskCnpjCpf(e.target.value) })}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setCreateErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(form.name); if (nameErr) errs.name = nameErr;
                  if (form.serviceType.trim().length < 2) errs.serviceType = 'Tipo de serviço deve ter pelo menos 2 caracteres';
                  const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr;
                  if (!form.phone) errs.phone = 'Telefone é obrigatório';
                  else { const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr; }
                  if (Object.keys(errs).length) { setCreateErrors(errs); return; }
                  setCreateErrors({});
                  createMutation.mutate(form);
                }}
                disabled={!form.name || !form.serviceType || createMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Prestador de Serviço</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome/Empresa *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.name ? 'border-red-400' : ''}`}
                />
                {editErrors.name && <p className="text-xs text-red-500 mt-0.5">{editErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de Serviço *</label>
                <input
                  value={editForm.serviceType}
                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.serviceType ? 'border-red-400' : ''}`}
                />
                {editErrors.serviceType && <p className="text-xs text-red-500 mt-0.5">{editErrors.serviceType}</p>}
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
                <label className="text-sm font-medium">Telefone *</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-0000"
                />
                {editErrors.phone && <p className="text-xs text-red-500 mt-0.5">{editErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CNPJ/CPF</label>
                <input
                  value={editForm.cnpj}
                  onChange={(e) => setEditForm({ ...editForm, cnpj: maskCnpjCpf(e.target.value) })}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditModal(false); setEditTarget(null); setEditErrors({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => {
                  const errs: Record<string, string> = {};
                  const nameErr = validateName(editForm.name); if (nameErr) errs.name = nameErr;
                  if (editForm.serviceType.trim().length < 2) errs.serviceType = 'Tipo de serviço deve ter pelo menos 2 caracteres';
                  const emailErr = validateEmail(editForm.email); if (emailErr) errs.email = emailErr;
                  if (!editForm.phone) errs.phone = 'Telefone é obrigatório';
                  else { const phoneErr = validatePhone(editForm.phone); if (phoneErr) errs.phone = phoneErr; }
                  if (Object.keys(errs).length) { setEditErrors(errs); return; }
                  setEditErrors({});
                  updateMutation.mutate(editForm);
                }}
                disabled={updateMutation.isPending || !editForm.name || !editForm.serviceType}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
