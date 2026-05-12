import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  CircleDollarSign,
  AlertCircle,
  Wrench,
  Calendar,
  TrendingDown,
  TrendingUp,
  Loader2,
  Home,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface SyndicDashboard {
  kpis: {
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    activeResidents: number;
    paidThisMonth: number;
    pendingThisMonth: number;
    overdueAll: number;
    inadimplenciaRate: number;
    ticketsOpen: number;
    occurrencesOpen: number;
    upcomingMaintenances: number;
    reservationsUpcoming: number;
  };
  chargesByMonth: Array<{ month: string; paid: number; pending: number; overdue: number }>;
  occurrencesByStatus: Array<{ status: string; count: number }>;
  topInadimplentes: Array<{ unitId: string; unit: string; chargesOverdue: number; totalAmount: number }>;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  IN_ANALYSIS: 'Em análise',
  RESOLVED: 'Resolvida',
  CLOSED: 'Fechada',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#f59e0b',
  IN_ANALYSIS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#9ca3af',
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color = 'blue',
  trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'indigo';
  trend?: 'up' | 'down';
}) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />)}
      </div>
      <p className="text-2xl font-bold mt-3 text-gray-900">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SyndicDashboardPage() {
  const { selectedCondominiumId } = useAuthStore();

  const dash = useQuery<SyndicDashboard>({
    queryKey: ['syndic-dashboard', selectedCondominiumId],
    queryFn: async () =>
      (await api.get(`/dashboard/${selectedCondominiumId}/syndic`)).data.data,
    enabled: !!selectedCondominiumId,
  });

  const occurrencesChart = useMemo(
    () =>
      (dash.data?.occurrencesByStatus ?? []).map((o) => ({
        name: STATUS_LABELS[o.status] ?? o.status,
        value: o.count,
        color: STATUS_COLORS[o.status] ?? '#94a3b8',
      })),
    [dash.data],
  );

  if (!selectedCondominiumId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        Selecione um condomínio para ver o dashboard.
      </div>
    );
  }
  if (dash.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!dash.data) return null;

  const k = dash.data.kpis;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Painel do Síndico</h1>
        <p className="text-muted-foreground">
          Visão consolidada do condomínio: financeiro, ocupação, ocorrências, manutenções.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Building2}
          label="Unidades"
          value={`${k.occupiedUnits}/${k.totalUnits}`}
          hint={`Ocupação ${k.occupancyRate}%`}
          color="blue"
        />
        <KpiCard
          icon={Users}
          label="Moradores ativos"
          value={k.activeResidents}
          color="indigo"
        />
        <KpiCard
          icon={CircleDollarSign}
          label="Inadimplência (mês)"
          value={`${k.inadimplenciaRate}%`}
          hint={`${k.pendingThisMonth} pendentes de ${k.paidThisMonth + k.pendingThisMonth}`}
          color={k.inadimplenciaRate >= 20 ? 'red' : k.inadimplenciaRate >= 10 ? 'amber' : 'green'}
          trend={k.inadimplenciaRate > 0 ? 'down' : 'up'}
        />
        <KpiCard
          icon={AlertCircle}
          label="Cobranças vencidas"
          value={k.overdueAll}
          color={k.overdueAll > 0 ? 'red' : 'green'}
        />
        <KpiCard
          icon={Wrench}
          label="Chamados abertos"
          value={k.ticketsOpen}
          color={k.ticketsOpen > 5 ? 'amber' : 'blue'}
        />
        <KpiCard
          icon={AlertCircle}
          label="Ocorrências"
          value={k.occurrencesOpen}
          color={k.occurrencesOpen > 0 ? 'amber' : 'green'}
        />
        <KpiCard
          icon={Calendar}
          label="Manutenções (30d)"
          value={k.upcomingMaintenances}
          color="blue"
        />
        <KpiCard
          icon={Home}
          label="Reservas (30d)"
          value={k.reservationsUpcoming}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Cobranças por mês (últimos 6)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dash.data.chargesByMonth}>
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="paid" name="Pagas" stackId="a" fill="#10b981" />
              <Bar dataKey="pending" name="Pendentes" stackId="a" fill="#f59e0b" />
              <Bar dataKey="overdue" name="Vencidas" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Ocorrências por status</h3>
          {occurrencesChart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma ocorrência registrada.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={occurrencesChart}
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={(entry: any) => `${entry.value}`}
                >
                  {occurrencesChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4">Top 5 unidades com cobranças vencidas</h3>
        {dash.data.topInadimplentes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            🎉 Nenhuma unidade inadimplente no momento.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Unidade</th>
                <th className="px-3 py-2 text-right">Cobranças vencidas</th>
                <th className="px-3 py-2 text-right">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dash.data.topInadimplentes.map((t) => (
                <tr key={t.unitId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{t.unit}</td>
                  <td className="px-3 py-2 text-right">{t.chargesOverdue}</td>
                  <td className="px-3 py-2 text-right text-red-700 font-medium">
                    {formatBRL(t.totalAmount)}
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

export default SyndicDashboardPage;
