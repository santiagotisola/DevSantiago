import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  Search,
} from 'lucide-react';

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
type RoleEnum =
  | 'SUPER_ADMIN'
  | 'CONDOMINIUM_ADMIN'
  | 'SYNDIC'
  | 'DOORMAN'
  | 'RESIDENT'
  | 'SERVICE_PROVIDER'
  | 'COUNCIL_MEMBER';

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  role: RoleEnum;
  unit: { identifier: string; block: string | null } | null;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string;
  sendCount: number;
  createdAt: string;
  status: InvitationStatus;
}

const ROLE_LABELS: Record<RoleEnum, string> = {
  SUPER_ADMIN: 'Super Admin',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  SERVICE_PROVIDER: 'Prestador',
  COUNCIL_MEMBER: 'Conselheiro',
};

const STATUS_META: Record<InvitationStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  expired: { label: 'Expirado', color: 'bg-gray-100 text-gray-700', icon: AlertTriangle },
  revoked: { label: 'Revogado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h atrás`;
  const d = Math.round(hr / 24);
  return `${d} d atrás`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function InvitationsPage() {
  const queryClient = useQueryClient();
  const { selectedCondominiumId } = useAuthStore();
  const condominiumId = selectedCondominiumId;

  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  function notify(kind: 'success' | 'error', msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), kind === 'success' ? 2500 : 4000);
  }

  const list = useQuery({
    queryKey: ['invitations', condominiumId],
    queryFn: async () => {
      if (!condominiumId) return [] as Invitation[];
      const r = await api.get<{ data: { invitations: Invitation[] } }>(
        `/invitations?condominiumId=${condominiumId}`,
      );
      return r.data.data.invitations;
    },
    enabled: !!condominiumId,
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invitations/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', condominiumId] });
      notify('success', 'Convite reenviado.');
    },
    onError: (err: any) =>
      notify('error', err?.response?.data?.message ?? 'Erro ao reenviar.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', condominiumId] });
      notify('success', 'Convite revogado.');
    },
    onError: (err: any) =>
      notify('error', err?.response?.data?.message ?? 'Erro ao revogar.'),
  });

  const filtered = useMemo(() => {
    const items = list.data ?? [];
    return items.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inv.email.toLowerCase().includes(q) ||
          (inv.name?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [list.data, statusFilter, search]);

  if (!condominiumId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        Selecione um condomínio para ver os convites.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Convites</h1>
          <p className="text-muted-foreground">
            Acompanhe convites enviados, reenvie ou revogue links pendentes.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo convite
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'accepted', 'expired', 'revoked'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                statusFilter === s
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {list.isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            Nenhum convite {statusFilter !== 'all' ? STATUS_META[statusFilter].label.toLowerCase() : ''}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Destinatário</th>
                <th className="px-4 py-3 text-left">Papel</th>
                <th className="px-4 py-3 text-left">Unidade</th>
                <th className="px-4 py-3 text-left">Convidado por</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Validade</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inv) => {
                const Status = STATUS_META[inv.status].icon;
                const canResend = inv.status === 'pending' || inv.status === 'expired';
                const canRevoke = inv.status === 'pending';
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{inv.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{ROLE_LABELS[inv.role]}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {inv.unit
                        ? `${inv.unit.block ? `${inv.unit.block}/` : ''}${inv.unit.identifier}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{inv.invitedBy}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_META[inv.status].color
                        }`}
                      >
                        <Status className="w-3 h-3" />
                        {STATUS_META[inv.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div>{formatDate(inv.expiresAt)}</div>
                      <div className="text-[10px] mt-0.5">
                        {inv.sendCount > 1 ? `${inv.sendCount} envios — último ${timeAgo(inv.lastSentAt)}` : `Enviado ${timeAgo(inv.lastSentAt)}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canResend && (
                          <button
                            onClick={() => resendMutation.mutate(inv.id)}
                            disabled={resendMutation.isPending}
                            title="Reenviar"
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {canRevoke && (
                          <button
                            onClick={() => {
                              if (confirm('Revogar este convite? O link enviado deixará de funcionar.')) {
                                revokeMutation.mutate(inv.id);
                              }
                            }}
                            disabled={revokeMutation.isPending}
                            title="Revogar"
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <NewInvitationModal
          condominiumId={condominiumId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['invitations', condominiumId] });
            notify('success', 'Convite enviado.');
            setShowCreate(false);
          }}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-[80]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm ${
              toast.kind === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function NewInvitationModal({
  condominiumId,
  onClose,
  onCreated,
}: {
  condominiumId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleEnum>('SYNDIC');
  const [unitId, setUnitId] = useState('');
  const [error, setError] = useState('');

  const units = useQuery({
    queryKey: ['units-for-invite', condominiumId],
    queryFn: async () => {
      const r = await api.get(`/units/condominium/${condominiumId}`);
      return r.data.data.units as Array<{ id: string; identifier: string; block: string | null }>;
    },
    enabled: role === 'RESIDENT',
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        role,
        condominiumId,
      };
      if (name.trim()) payload.name = name.trim();
      if (role === 'RESIDENT' && unitId) payload.unitId = unitId;
      return api.post('/invitations', payload);
    },
    onSuccess: onCreated,
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Erro ao criar convite.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('E-mail inválido.');
      return;
    }
    if (role === 'RESIDENT' && !unitId) {
      setError('Selecione a unidade do morador.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Novo convite
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nome (opcional)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como aparece no email"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Papel *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleEnum)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SYNDIC">Síndico</option>
              <option value="CONDOMINIUM_ADMIN">Administrador</option>
              <option value="COUNCIL_MEMBER">Conselheiro</option>
              <option value="DOORMAN">Porteiro</option>
              <option value="SERVICE_PROVIDER">Prestador</option>
              <option value="RESIDENT">Morador</option>
            </select>
          </div>
          {role === 'RESIDENT' && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Unidade *</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione…</option>
                {(units.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.block ? `${u.block}/` : ''}
                    {u.identifier}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar convite
          </button>
        </div>
      </form>
    </div>
  );
}

export default InvitationsPage;
