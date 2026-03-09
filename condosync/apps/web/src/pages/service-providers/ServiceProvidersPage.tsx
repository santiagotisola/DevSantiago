import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Briefcase, Plus, Search, Loader2, CheckCircle, Mail, Phone } from 'lucide-react';

export function ServiceProvidersPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', serviceType: '', email: '', phone: '', cnpj: '' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: providers, isLoading } = useQuery({
    queryKey: ['service-providers', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/service-providers/condominium/${selectedCondominiumId}`); return res.data.data.providers; },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/service-providers', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['service-providers'] }); setShowModal(false); setForm({ name: '', serviceType: '', email: '', phone: '', cnpj: '' }); },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/service-providers/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-providers'] }),
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
              {isAdmin && !p.isApproved && (
                <button onClick={() => approveMutation.mutate(p.id)} className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-green-700 border border-green-200 hover:bg-green-50 py-1.5 rounded-lg font-medium">
                  <CheckCircle className="w-3 h-3" /> Aprovar
                </button>
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
              {[['Nome/Empresa *', 'name'], ['Tipo de Serviço *', 'serviceType'], ['E-mail', 'email'], ['Telefone', 'phone'], ['CNPJ', 'cnpj']].map(([label, key]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.serviceType || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Cadastrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
