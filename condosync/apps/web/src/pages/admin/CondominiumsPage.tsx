import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Building2, Plus, Loader2, Users, Home } from 'lucide-react';

export function CondominiumsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', zipCode: '', cnpj: '' });

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
      setForm({ name: '', address: '', city: '', state: '', cnpj: '' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Condomínios</h1>
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
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  {c.city && <p className="text-xs text-muted-foreground">{c.city}{c.state ? ` - ${c.state}` : ''}</p>}
                  {c.address && <p className="text-xs text-muted-foreground truncate">{c.address}</p>}
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {c._count?.units ?? 0} unidades</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c._count?.condominiumUsers ?? 0} membros</span>
              </div>
              {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
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
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
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
    </div>
  );
}
