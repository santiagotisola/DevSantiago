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
  ChevronRight,
  Loader2,
  Building2,
  HardHat,
  FileText,
  MessageSquare,
  Image,
  Video,
  Bell,
  Plus,
} from "lucide-react";
import { formatCurrency, formatRelativeTime } from "../../lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
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

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  to,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
  to?: string;
}) {
  const content = (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 h-full ${to ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {title}
          </p>
          <p className="text-3xl font-black text-gray-800 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider ${trend.value >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            >
              <TrendingUp
                className={`w-3 h-3 ${trend.value < 0 ? "rotate-180" : ""}`}
              />
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-2xl shadow-lg shadow-current/10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

function ResidentDashboard({
  d,
  user,
  selectedCondominiumId,
}: {
  d: any;
  user: any;
  selectedCondominiumId: string | null;
}) {
  const condominium = user?.condominiumUsers?.find(
    (cu: any) => cu.condominium.id === selectedCondominiumId,
  )?.condominium;

  const { data: openTickets } = useQuery({
    queryKey: ["resident-tickets-open", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/tickets/${selectedCondominiumId}?status=OPEN`,
      );
      return (res.data.data ?? []) as any[];
    },
    enabled: !!selectedCondominiumId,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-8 pb-8">
      {/* Header Premium Resident */}
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
          Unidade {user?.residentUnits?.[0]?.unit?.number || "—"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Minhas Encomendas"
          value={d?.portaria?.parcelsAwaiting ?? 0}
          subtitle="pendentes na portaria"
          icon={Package}
          color="bg-amber-500"
          to="/minha-portaria/encomendas"
        />
        <StatCard
          title="Minhas Reservas"
          value={d?.communication?.upcomingReservations ?? 0}
          subtitle="áreas agendadas"
          icon={Calendar}
          color="bg-teal-500"
          to="/areas-comuns"
        />
        <StatCard
          title="Eventos / Avisos"
          value={d?.communication?.unreadOccurrences ?? 0}
          subtitle="não lidos"
          icon={Bell}
          color="bg-indigo-500"
          to="/comunicacao/avisos"
        />
        <StatCard
          title="Meus Chamados"
          value={openTickets?.length ?? 0}
          subtitle="em andamento"
          icon={MessageSquare}
          color="bg-blue-500"
          to="/chamados"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Comunicados Recentes
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                Fique por dentro das novidades
              </p>
            </div>
            <Link
              to="/comunicacao/avisos"
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-colors border border-gray-100"
            >
              Ver Tudo
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-auto max-h-[450px] pr-2 custom-scrollbar">
            {d?.recentAnnouncements?.length > 0 ? (
              d.recentAnnouncements.map((a: any) => (
                <div
                  key={a.id}
                  className="group flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 h-fit ${a.isPinned ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {a.title}
                    </p>
                    <p className="text-[12px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                      {a.content}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3">
                      {formatRelativeTime(a.publishedAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Nenhum aviso no momento
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm h-full">
          <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">
            Acesso Rápido
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Visita",
                to: "/minha-portaria/visitantes",
                icon: Shield,
                color: "text-purple-600 bg-purple-50",
              },
              {
                label: "Encomenda",
                to: "/minha-portaria/encomendas",
                icon: Package,
                color: "text-amber-600 bg-amber-50",
              },
              {
                label: "Reserva",
                to: "/areas-comuns",
                icon: Calendar,
                color: "text-teal-600 bg-teal-50",
              },
              {
                label: "Chamado",
                to: "/chamados",
                icon: MessageSquare,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Documentos",
                to: "/documentos",
                icon: FileText,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Ocorrência",
                to: "/comunicacao/ocorrencias",
                icon: AlertTriangle,
                color: "text-yellow-600 bg-yellow-50",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all text-center"
              >
                <div
                  className={`${item.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-600">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const d = data;

  if (user?.role === "RESIDENT") {
    return (
      <ResidentDashboard
        d={d}
        user={user}
        selectedCondominiumId={selectedCondominiumId}
      />
    );
  }

  const visitorsWeek = d?.portaria?.visitorStats || [];
  const parcelWeek = d?.portaria?.parcelStats || [];
  const financeMonths = d?.financial?.financeStats || [];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-8 pb-8">
      {/* Header Premium */}
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

      {/* Grid de Métricas Visuais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ocupação Geral"
          value={`${d?.summary?.occupiedUnits || 0}`}
          subtitle={`de ${d?.summary?.totalUnits || 0} unidades`}
          icon={Home}
          color="bg-indigo-500"
          trend={{ value: 2.5, label: "este mês" }}
          to="/unidades"
        />
        <StatCard
          title="Visitantes Ativos"
          value={d?.portaria?.visitorsInside || 0}
          subtitle={`${d?.portaria?.visitorsToday || 0} hoje`}
          icon={Users}
          color="bg-fuchsia-500"
          to="/portaria/visitantes"
        />
        <StatCard
          title="Encomendas"
          value={d?.portaria?.parcelsAwaiting || 0}
          subtitle="na portaria"
          icon={Package}
          color="bg-amber-500"
          trend={{ value: -12, label: "vs ontem" }}
          to="/portaria/encomendas"
        />
        <StatCard
          title="Incidentes"
          value={d?.maintenance?.urgentOrders || 0}
          subtitle={`${d?.maintenance?.openOrders || 0} abertos`}
          icon={AlertTriangle}
          color="bg-rose-500"
          to="/manutencao"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm h-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Saúde Financeira
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                Fluxo de caixa (6 meses)
              </p>
            </div>
            <Link
              to="/financeiro"
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-colors border border-gray-100"
            >
              Relatório
            </Link>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeMonths}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F3F4F6"
                />
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
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#colorRec)"
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  stroke="#EF4444"
                  strokeWidth={3}
                  fill="url(#colorDes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col h-full">
          <h3 className="text-lg font-bold text-gray-800 mb-6 font-inter">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[
              {
                label: "Visita",
                to: "/portaria/visitantes",
                icon: Shield,
                color: "text-purple-600 bg-purple-50",
              },
              {
                label: "Encomenda",
                to: "/portaria/encomendas",
                icon: Package,
                color: "text-amber-600 bg-amber-50",
              },
              {
                label: "Chamado",
                to: "/manutencao",
                icon: Wrench,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Cobrança",
                to: "/financeiro/cobrancas",
                icon: DollarSign,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Áreas",
                to: "/areas-comuns",
                icon: Calendar,
                color: "text-teal-600 bg-teal-50",
              },
              {
                label: "Aviso",
                to: "/comunicacao/avisos",
                icon: Bell,
                color: "text-blue-600 bg-blue-50",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
              >
                <div
                  className={`${item.color} p-3 rounded-xl transform group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Visitantes (Semana)
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={visitorsWeek}>
                <defs>
                  <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="step"
                  dataKey="visitantes"
                  stroke="#8B5CF6"
                  fill="url(#colorVis)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Encomendas (Semana)
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={parcelWeek}>
                <defs>
                  <linearGradient id="colorPar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="recebidas"
                  stroke="#F59E0B"
                  fill="url(#colorPar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Comunicados</h3>
            <Link
              to="/comunicacao/avisos"
              className="text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-5 h-5" />
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-auto max-h-[350px] pr-2 custom-scrollbar">
            {d?.recentAnnouncements?.length > 0 ? (
              d.recentAnnouncements.map((a: any) => (
                <div
                  key={a.id}
                  className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 h-fit ${a.isPinned ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {a.title}
                    </p>
                    <p className="text-[12px] text-gray-500 line-clamp-2 mt-1">
                      {a.content}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3">
                      {formatRelativeTime(a.publishedAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <Shield className="w-8 h-8 mb-4 " />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Sem avisos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acesso rápido */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Registrar Visita",
              to: "/portaria/visitantes",
              icon: Shield,
              color: "text-purple-600 bg-purple-50",
            },
            {
              label: "Registrar Encomenda",
              to: "/portaria/encomendas",
              icon: Package,
              color: "text-orange-600 bg-orange-50",
            },
            {
              label: "Abrir Chamado",
              to: "/manutencao",
              icon: Wrench,
              color: "text-red-600 bg-red-50",
            },
            {
              label: "Nova Cobrança",
              to: "/financeiro/cobranças",
              icon: DollarSign,
              color: "text-green-600 bg-green-50",
            },
            {
              label: "Reservar Área",
              to: "/areas-comuns",
              icon: Calendar,
              color: "text-teal-600 bg-teal-50",
            },
            {
              label: "Novo Comunicado",
              to: "/comunicacao/avisos",
              icon: Users,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "Assembleias",
              to: "/assembleias",
              icon: Video,
              color: "text-indigo-600 bg-indigo-50",
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${item.color} hover:opacity-80 transition-opacity text-center`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
