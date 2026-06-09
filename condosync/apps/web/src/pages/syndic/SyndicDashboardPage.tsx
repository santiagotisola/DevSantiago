import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Users, Home, Wrench, AlertTriangle,
  CheckCircle, Clock, DollarSign, BarChart2, Calendar
} from "lucide-react";

interface SyndicStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalResidents: number;
  openTickets: number;
  resolvedTickets: number;
  openMaintenance: number;
  pendingCharges: number;
  collectedThisMonth: number;
  defaultRate: number;
  upcomingAssemblies: number;
  pendingOccurrences: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {sub}
          </span>
        )}
        {!trend && sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

export function SyndicDashboardPage() {
  const { selectedCondominiumId } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["syndic-stats", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}/reports/syndic-summary`);
      return res.data?.data as SyndicStats;
    },
    enabled: !!selectedCondominiumId,
  });

  const occupancyRate = stats
    ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
    : null;

  const ticketResolutionRate = stats && stats.openTickets + stats.resolvedTickets > 0
    ? Math.round((stats.resolvedTickets / (stats.openTickets + stats.resolvedTickets)) * 100)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-3" />
        Carregando painel do síndico...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-600" />
          Painel do Síndico
        </h1>
        <p className="text-sm text-gray-500">Visão gerencial consolidada do condomínio</p>
      </div>

      {/* Grade de estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Unidades"
          value={stats?.totalUnits ?? "—"}
          icon={Home}
          color="bg-blue-100 text-blue-600"
          sub={`${stats?.vacantUnits ?? 0} vagas`}
        />
        <StatCard
          label="Ocupação"
          value={occupancyRate != null ? `${occupancyRate}%` : "—"}
          icon={Home}
          color="bg-emerald-100 text-emerald-600"
          trend="up"
          sub={`${stats?.occupiedUnits ?? 0} ocupadas`}
        />
        <StatCard
          label="Moradores"
          value={stats?.totalResidents ?? "—"}
          icon={Users}
          color="bg-violet-100 text-violet-600"
        />
        <StatCard
          label="Taxa de Inadimplência"
          value={stats?.defaultRate != null ? `${stats.defaultRate.toFixed(1)}%` : "—"}
          icon={TrendingDown}
          color="bg-red-100 text-red-500"
          trend={stats?.defaultRate != null && stats.defaultRate > 10 ? "down" : "up"}
          sub={stats?.defaultRate != null && stats.defaultRate > 10 ? "Atenção" : "Saudável"}
        />
        <StatCard
          label="Chamados Abertos"
          value={stats?.openTickets ?? "—"}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-500"
          sub={ticketResolutionRate != null ? `${ticketResolutionRate}% resolvidos` : undefined}
        />
        <StatCard
          label="Manutenções Abertas"
          value={stats?.openMaintenance ?? "—"}
          icon={Wrench}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          label="Cobranças Pendentes"
          value={stats?.pendingCharges ?? "—"}
          icon={Clock}
          color="bg-rose-100 text-rose-500"
        />
        <StatCard
          label="Arrecadado (mês)"
          value={
            stats?.collectedThisMonth != null
              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.collectedThisMonth)
              : "—"
          }
          icon={DollarSign}
          color="bg-green-100 text-green-600"
          trend="up"
        />
      </div>

      {/* Assembleia e Ocorrências */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Assembleias Agendadas</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.upcomingAssemblies ?? "—"}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ocorrências Pendentes</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.pendingOccurrences ?? "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
