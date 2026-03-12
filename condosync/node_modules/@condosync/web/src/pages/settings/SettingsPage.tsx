import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Settings, Save, Loader2, Building2 } from 'lucide-react';

export function SettingsPage() {
  const { selectedCondominiumId } = useAuthStore();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);

  const { data: condominium, isLoading } = useQuery({
    queryKey: ['condominium', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}`);
      return res.data.data.condominium;
    },
    enabled: !!selectedCondominiumId,
  });

  if (condominium && !initialized) {
    setForm({
      name: condominium.name || '',
      cnpj: condominium.cnpj || '',
      address: condominium.address || '',
      city: condominium.city || '',
      state: condominium.state || '',
      zipCode: condominium.zipCode || '',
      phone: condominium.phone || '',
      email: condominium.email || '',
    });
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (d: Record<string, any>) => api.put(`/condominiums/${selectedCondominiumId}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominium'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const fields = [
    ['Nome do condomínio *', 'name'], ['CNPJ', 'cnpj'], ['Endereço', 'address'],
    ['Cidade', 'city'], ['Estado', 'state'], ['CEP', 'zipCode'],
    ['Telefone', 'phone'], ['E-mail de contato', 'email'],
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Dados e configurações do condomínio</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <div className="bg-white rounded-xl border p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">Dados do Condomínio</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(([label, key]) => (
              <div key={key} className={`space-y-1 ${key === 'name' || key === 'address' ? 'sm:col-span-2' : ''}`}>
                <label className="text-sm font-medium">{label}</label>
                <input
                  value={form[key] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={!form.name || updateMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  );
}
