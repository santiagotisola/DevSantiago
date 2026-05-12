import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  CircleDollarSign,
  TrendingUp,
  Loader2,
  Mail,
  Bell,
  ShieldCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../../services/api';

interface SaasDashboard {
  kpis: {
    totalCondominiums: number;
    activeCondominiums: number;
    newCondominiumsThisMonth: number;
    totalUsers: number;
    activeUsers30d: number;
    activeUsers60d: number;
    dauMau30d: number;
    pendingInvitations: number;
    acceptedInvitations30d: number;
    pushSubsTotal: number;
    twoFAAdoptionPct: number;
    mrr: number;
    arr: number;
    churnRate30d: number;
  };
  planBreakdown: Array<{
    slug: string;
    name: string;
    condominiums: number;
    pricePerMonth: number;
    mrr: number;
  }>;
  adoptionFunnel: {
    total: number;
    withAdmin: number;
    withUnits: number;
    withResidents: number;
    activeUse30d: number;
  };
  growthSeries: Array<{ month: string; created: number; cumulative: number }>;
  topActiveCondominiums: Array<{
    condominiumId: string;
    name: string;
    plan: string;
    maxUnits: number;
    activeUsers30d: number;
  }>;
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function KpiBox({
  icon: Icon,
  label,
  value,
  hint,
  big = false,
  color = 'blue',
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  big?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'indigo' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <div className={`bg-white rounded-xl border p-4 ${big ? 'md:col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-gray-900 ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function FunnelBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-muted-foreground">
          {value}/{total} <span className="font-medium text-gray-900">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SaasDashboardPage() {
  const dash = useQuery<SaasDashboard>({
    queryKey: ['saas-dashboard'],
    queryFn: async () => (await api.get('/dashboard/saas')).data.data,
  });

  if (dash.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!dash.data) return null;

  const k = dash.data.kpis;
  const f = dash.data.adoptionFunnel;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Painel SaaS</h1>
        <p className="text-muted-foreground">
          Saúde do negócio CondoSync: MRR, adoção, retenção e crescimento.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox icon={CircleDollarSign} label="MRR" value={formatBRL(k.mrr)} big color="green" />
        <KpiBox icon={TrendingUp} label="ARR projetado" value={formatBRL(k.arr)} big color="indigo" />
        <KpiBox
          icon={Building2}
          label="Condomínios ativos"
          value={`${k.activeCondominiums}/${k.totalCondominiums}`}
          hint={k.newCondominiumsThisMonth > 0 ? `+${k.newCondominiumsThisMonth} este mês` : 'Sem novos este mês'}
          color="blue"
        />
        <KpiBox
          icon={Activity}
          label="Churn rate (30d)"
          value={`${k.churnRate30d}%`}
          color={k.churnRate30d >= 5 ? 'red' : k.churnRate30d >= 2 ? 'amber' : 'green'}
        />
        <KpiBox
          icon={Users}
          label="Usuários ativos 30d"
          value={k.activeUsers30d.toLocaleString('pt-BR')}
          hint={`de ${k.totalUsers.toLocaleString('pt-BR')} cadastrados`}
          color="purple"
        />
        <KpiBox
          icon={TrendingUp}
          label="DAU/MAU stickiness"
          value={`${k.dauMau30d}%`}
          hint="30d / 60d"
          color={k.dauMau30d >= 50 ? 'green' : k.dauMau30d >= 25 ? 'amber' : 'red'}
        />
        <KpiBox
          icon={Mail}
          label="Convites pendentes"
          value={k.pendingInvitations}
          hint={`${k.acceptedInvitations30d} aceitos em 30d`}
          color="blue"
        />
        <KpiBox
          icon={Bell}
          label="Push subscriptions"
          value={k.pushSubsTotal}
          hint={`${k.twoFAAdoptionPct}% com 2FA`}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Crescimento de condomínios (6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dash.data.growthSeries}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Total acumulado"
                stroke="#3b82f6"
                fill="url(#cumGrad)"
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Novos no mês"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Funil de adoção</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Condomínios ativos progredindo pelas etapas-chave.
          </p>
          <div className="space-y-3">
            <FunnelBar label="Criado" value={f.total} total={f.total} />
            <FunnelBar label="Com admin/síndico" value={f.withAdmin} total={f.total} />
            <FunnelBar label="Com unidades" value={f.withUnits} total={f.total} />
            <FunnelBar label="Com moradores" value={f.withResidents} total={f.total} />
            <FunnelBar label="Uso ativo (30d)" value={f.activeUse30d} total={f.total} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Receita por plano (MRR)</h3>
          {dash.data.planBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum condomínio em plano cadastrado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dash.data.planBreakdown}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="mrr" name="MRR" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-gray-500 uppercase">
                <th className="text-left py-1">Plano</th>
                <th className="text-right py-1">Condos</th>
                <th className="text-right py-1">Preço/mês</th>
                <th className="text-right py-1">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dash.data.planBreakdown.map((p) => (
                <tr key={p.slug}>
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td className="py-1.5 text-right">{p.condominiums}</td>
                  <td className="py-1.5 text-right">{formatBRL(p.pricePerMonth)}</td>
                  <td className="py-1.5 text-right font-medium text-green-700">{formatBRL(p.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Top 5 condomínios por uso</h3>
          {dash.data.topActiveCondominiums.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma atividade ainda. Convide usuários para ver os dados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left py-1">Condomínio</th>
                  <th className="text-left py-1">Plano</th>
                  <th className="text-right py-1">Usuários ativos (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dash.data.topActiveCondominiums.map((c) => (
                  <tr key={c.condominiumId}>
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 font-mono text-xs">{c.plan}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        {c.activeUsers30d}
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="font-medium text-blue-900">Adoção de 2FA: {k.twoFAAdoptionPct}%</p>
          <p className="text-xs text-blue-800">
            Recomendado &gt; 80% para roles de gestão. Considere forçar 2FA em planos pro+ via
            política de plano (futuro).
          </p>
        </div>
      </div>
    </div>
  );
}

export default SaasDashboardPage;
