import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import {
  Users,
  Package,
  Wrench,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Home,
  Shield,
  Calendar,
  Loader2,
  Building2,
  MessageSquare,
  Bell,
  UserCheck,
  Clock,
  Vote,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "../../lib/utils";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// ─── Skeleton Loading ──────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  alert,
  to,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  alert?: boolean;
  to?: string;
}) {
  const content = (
    <div
      className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all duration-300 h-full ${
        alert ? "border-red-200 bg-red-50/30" : "border-gray-100"
      } ${to ? "cursor-pointer hover:-translate-y-1" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {title}
          </p>
          <p className={`text-3xl font-black tracking-tight ${alert ? "text-red-600" : "text-gray-800"}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-2xl shadow-lg shadow-current/10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

// ─── Activity Icon ─────────────────────────────────────────────────────────
function getActivityIcon(type: string) {
  switch (type) {
    case "visitor":
      return { icon: UserCheck, color: "text-purple-600 bg-purple-50" };
    case "parcel":
      return { icon: Package, color: "text-amber-600 bg-amber-50" };
    case "ticket":
      return { icon: MessageSquare, color: "text-blue-600 bg-blue-50" };
    case "maintenance":
      return { icon: Wrench, color: "text-rose-600 bg-rose-50" };
    default:
      return { icon: Bell, color: "text-gray-600 bg-gray-50" };
  }
}

// ─── Pie Chart Colors ──────────────────────────────────────────────────────
const TICKET_COLORS = ["#3B82F6", "#F59E0B", "#10B981"];

// ─── Main Dashboard ────────────────────────────────────────────────────────
export function DashboardPage() {
  const { selectedCondominiumId, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/${selectedCondominiumId}`);
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 60000,
  });

  const condominium = user?.condominiumUsers?.find(
    (cu) => cu.condominium.id === selectedCondominiumId,
  )?.condominium;

  if (!selectedCondominiumId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <Building2 className="w-12 h-12" />
        <p>Selecione um condomínio para continuar</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const d = data;
  const metrics = d?.metrics;
  const financialChart = d?.financialChart || [];
  const ticketsByStatus = d?.ticketsByStatus || { open: 0, inProgress: 0, closed: 0 };
  const recentActivity = d?.recentActivity || [];
  const upcomingAssemblies = d?.upcomingAssemblies || [];

  const ticketPieData = [
    { name: "Abertos", value: ticketsByStatus.open },
    { name: "Em Andamento", value: ticketsByStatus.inProgress },
    { name: "Fechados", value: ticketsByStatus.closed },
  ].filter((d) => d.value > 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            {greeting}, {user?.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            {condominium?.name} ·{" "}
            <span className="text-blue-600">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Sistema Online
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Moradores Ativos"
          value={metrics?.totalResidents ?? 0}
          subtitle={`${metrics?.totalUnits ?? 0} unidades`}
          icon={Users}
          color="bg-indigo-500"
          to="/moradores"
        />
        <KPICard
          title="Taxa de Ocupação"
          value={`${metrics?.occupancyRate ?? 0}%`}
          subtitle={`${metrics?.occupiedUnits ?? 0} de ${metrics?.totalUnits ?? 0}`}
          icon={Home}
          color="bg-teal-500"
          to="/unidades"
        />
        <KPICard
          title="Visitantes Pendentes"
          value={metrics?.pendingVisitors ?? 0}
          subtitle="aguardando aprovação"
          icon={UserCheck}
          color="bg-purple-500"
          to="/portaria/visitantes"
        />
        <KPICard
          title="Encomendas Pendentes"
          value={metrics?.parcelsAwaiting ?? 0}
          subtitle="na portaria"
          icon={Package}
          color="bg-amber-500"
          to="/portaria/encomendas"
        />
        <KPICard
          title="Chamados Abertos"
          value={metrics?.openTickets ?? 0}
          subtitle="em aberto ou andamento"
          icon={MessageSquare}
          color="bg-blue-500"
          to="/chamados"
        />
        <KPICard
          title="Manutenções Abertas"
          value={metrics?.openMaintenanceOrders ?? 0}
          subtitle="ordens de serviço"
          icon={Wrench}
          color="bg-rose-500"
          to="/manutencao"
        />
        <KPICard
          title="Receita do Mês"
          value={formatBRL(metrics?.monthlyRevenue ?? 0)}
          subtitle="pagamentos confirmados"
          icon={DollarSign}
          color="bg-emerald-500"
          to="/financeiro"
        />
        <KPICard
          title="Cobranças Vencidas"
          value={metrics?.overdueCharges ?? 0}
          subtitle="em atraso"
          icon={AlertTriangle}
          color={metrics?.overdueCharges > 0 ? "bg-red-500" : "bg-gray-400"}
          alert={metrics?.overdueCharges > 0}
          to="/financeiro/cobrancas"
        />
      </div>

      {/* ── Gráficos ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Receita vs Despesa - Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Receita vs Despesa</h3>
              <p className="text-xs text-gray-400 font-medium">Últimos 6 meses</p>
            </div>
            <Link
              to="/financeiro"
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-colors border border-gray-100"
            >
              Detalhes
            </Link>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickFormatter={(val) =>
                    val >= 1000 ? `R$${(val / 1000).toFixed(0)}k` : `R$${val}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatBRL(value)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets por Status - Pie Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Chamados por Status</h3>
          <p className="text-xs text-gray-400 font-medium mb-4">Distribuição atual</p>
          {ticketPieData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {ticketPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={TICKET_COLORS[index % TICKET_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    verticalAlign="bottom"
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-center opacity-40">
              <MessageSquare className="w-8 h-8 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Sem chamados</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Feed de Atividades + Assembleias + Ações Rápidas ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Feed de Atividades Recentes */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Atividades Recentes</h3>
              <p className="text-xs text-gray-400 font-medium">Últimos eventos do condomínio</p>
            </div>
            <Clock className="w-5 h-5 text-gray-300" />
          </div>
          <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any) => {
                const { icon: ActivityIcon, color } = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${color}`}>
                      <ActivityIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.detail}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <Bell className="w-8 h-8 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Próximas Assembleias + Ações Rápidas */}
        <div className="space-y-6">
          {/* Próximas Assembleias */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Próximas Assembleias</h3>
              <Link to="/assembleias" className="text-blue-500 hover:text-blue-600">
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {upcomingAssemblies.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssemblies.map((assembly: any) => (
                  <Link
                    key={assembly.id}
                    to="/assembleias"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-50"
                  >
                    <div className="bg-violet-50 p-2 rounded-xl">
                      <Vote className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {assembly.title}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {new Date(assembly.scheduledAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma assembleia agendada</p>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Registrar Visitante", to: "/portaria/visitantes", icon: UserCheck, color: "text-purple-600 bg-purple-50" },
                { label: "Registrar Encomenda", to: "/portaria/encomendas", icon: Package, color: "text-amber-600 bg-amber-50" },
                { label: "Criar Chamado", to: "/chamados", icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
                { label: "Nova Reserva", to: "/areas-comuns", icon: Calendar, color: "text-teal-600 bg-teal-50" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 hover:border-gray-200"
                >
                  <div className={`${item.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
