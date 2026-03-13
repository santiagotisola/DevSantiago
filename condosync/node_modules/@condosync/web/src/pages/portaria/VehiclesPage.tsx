import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Car, Plus, Search, LogIn, LogOut, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function VehiclesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ plate: '', isResident: false, notes: '' });

  const canRegister = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['vehicle-logs', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/access-logs/${selectedCondominiumId}`);
      return res.data.data.logs;
    },
    enabled: !!selectedCondominiumId && canRegister,
  });

  const entryMutation = useMutation({
    mutationFn: (d: typeof logForm) => api.post('/vehicles/access-logs', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-logs'] }); setShowLogModal(false); },
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/vehicles/access-logs/${id}/exit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicle-logs'] }),
  });

  const filteredLogs = ((logs || []) as any[]).filter((l: any) =>
    (l.plate ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">Controle de acesso de veículos</p>
        </div>
        {canRegister && (
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Acesso
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Car className="w-10 h-10" />
            <p>Nenhum acesso registrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Placa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entrada</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Saída</th>
                  {canRegister && <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold">{l.plate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.isResident ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {l.isResident ? 'Morador' : 'Visitante'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(l.entryAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.exitAt ? formatDateTime(l.exitAt) : <span className="text-green-600 font-medium">Dentro</span>}</td>
                    {canRegister && (
                      <td className="px-4 py-3 text-right">
                        {!l.exitAt && (
                          <button
                            onClick={() => exitMutation.mutate(l.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 ml-auto"
                          >
                            <LogOut className="w-3 h-3" />
                            Registrar Saída
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Acesso de Veículo</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Placa *</label>
                <input
                  value={logForm.plate}
                  onChange={(e) => setLogForm({ ...logForm, plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={logForm.isResident}
                  onChange={(e) => setLogForm({ ...logForm, isResident: e.target.checked })}
                  className="rounded"
                />
                Veículo de morador
              </label>
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <input
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => entryMutation.mutate(logForm)}
                disabled={!logForm.plate || entryMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
