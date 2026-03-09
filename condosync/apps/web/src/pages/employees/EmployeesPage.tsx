import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { HardHat, Plus, Search, Loader2, Mail, Phone } from 'lucide-react';

export function EmployeesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '', shiftType: 'MORNING' });
  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', selectedCondominiumId],
    queryFn: async () => { const res = await api.get(`/employees/condominium/${selectedCondominiumId}`); return res.data.data.employees; },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => api.post('/employees', { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setShowModal(false); setForm({ name: '', role: '', email: '', phone: '', shiftType: 'MORNING' }); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const shiftLabels: Record<string, string> = { MORNING: 'Manhã', AFTERNOON: 'Tarde', NIGHT: 'Noite', FULL_TIME: 'Integral', ON_CALL: 'Plantão' };

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
                {e.shiftType && <p>Turno: {shiftLabels[e.shiftType] || e.shiftType}</p>}
              </div>
              {isAdmin && e.isActive && (
                <button onClick={() => deactivateMutation.mutate(e.id)} className="mt-3 w-full text-xs text-red-600 border border-red-200 hover:bg-red-50 py-1 rounded-lg">Desativar</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Funcionário</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['Nome *', 'name'], ['Cargo *', 'role'], ['E-mail', 'email'], ['Telefone', 'phone']].map(([label, key]) => (
                <div key={key} className={`space-y-1 ${key === 'name' ? 'col-span-2' : ''}`}>
                  <label className="text-sm font-medium">{label}</label>
                  <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Turno</label>
                <select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="MORNING">Manhã</option>
                  <option value="AFTERNOON">Tarde</option>
                  <option value="NIGHT">Noite</option>
                  <option value="FULL_TIME">Integral</option>
                  <option value="ON_CALL">Plantão</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.role || createMutation.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">Cadastrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
