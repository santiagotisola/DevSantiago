import { useState } from "react";
import { UserPlus, Mail, Copy, Check, Trash2, RefreshCw } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../components/ui/toaster";
// toast(message: string, type?: 'info'|'success'|'error'|'warning')

interface Invite {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: "Morador",
  DOORMAN: "Porteiro",
  SYNDIC: "Síndico",
  COUNCIL_MEMBER: "Conselheiro",
  SERVICE_PROVIDER: "Prestador",
};

export function InvitesPage() {
  const { selectedCondominiumId } = useAuthStore();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RESIDENT");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["invites", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}/invites`);
      return (res.data?.data?.invites ?? []) as Invite[];
    },
    enabled: !!selectedCondominiumId,
  });

  const invites = data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/condominiums/${selectedCondominiumId}/invites`, { email, role });
    },
    onSuccess: () => {
      toast("Convite enviado com sucesso!", "success");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["invites", selectedCondominiumId] });
    },
    onError: () => {
      toast("Erro ao enviar convite", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/condominiums/${selectedCondominiumId}/invites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", selectedCondominiumId] });
    },
  });

  const handleCopy = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACCEPTED: "bg-green-100 text-green-800",
    EXPIRED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convites</h1>
          <p className="text-sm text-gray-500">Convide moradores e colaboradores para o CondoSync</p>
        </div>
      </div>

      {/* Formulário de novo convite */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Enviar novo convite
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="E-mail do convidado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            aria-label="Perfil do convidado"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!email || createMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {createMutation.isPending ? "Enviando..." : "Convidar"}
          </button>
        </div>
      </div>

      {/* Lista de convites */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Convites enviados</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400 gap-2">
            <Mail className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhum convite enviado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-6 py-3">E-mail</th>
                <th className="text-left px-6 py-3">Perfil</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Expira em</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{inv.email}</td>
                  <td className="px-6 py-3 text-gray-600">{ROLE_LABELS[inv.role] ?? inv.role}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[inv.status]}`}>
                      {inv.status === "PENDING" ? "Pendente" : inv.status === "ACCEPTED" ? "Aceito" : "Expirado"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 flex items-center gap-2 justify-end">
                    <button
                      onClick={() => handleCopy(`${window.location.origin}/aceitar-convite/${inv.id}`, inv.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      title="Copiar link"
                    >
                      {copiedId === inv.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(inv.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400"
                      title="Cancelar convite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
