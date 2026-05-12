import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface Pref {
  type: string;
  inapp: boolean;
  email: boolean;
  push: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  VISITOR: 'Visitantes',
  PARCEL: 'Encomendas',
  MAINTENANCE: 'Manutenção',
  FINANCIAL: 'Financeiro',
  COMMUNICATION: 'Comunicados',
  RESERVATION: 'Reservas',
  OCCURRENCE: 'Ocorrências',
  ASSEMBLY: 'Assembleias',
};

export function NotificationPreferencesCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/notification-preferences').then((r) => r.data.data.preferences as Pref[]),
  });

  const upd = useMutation({
    mutationFn: (input: { type: string; patch: Partial<Pref> }) =>
      api.put(`/notification-preferences/${input.type}`, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BellRing className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold">Preferências de notificação</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Escolha por tipo onde você quer receber notificações.
      </p>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left py-2">Tipo</th>
                <th className="py-2">No app</th>
                <th className="py-2">E-mail</th>
                <th className="py-2">Push</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p) => (
                <tr key={p.type}>
                  <td className="py-2">{TYPE_LABEL[p.type] ?? p.type}</td>
                  {(['inapp', 'email', 'push'] as const).map((ch) => (
                    <td key={ch} className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={p[ch]}
                        disabled={upd.isPending}
                        onChange={(e) =>
                          upd.mutate({ type: p.type, patch: { [ch]: e.target.checked } })
                        }
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default NotificationPreferencesCard;
