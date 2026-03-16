import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight,
  Shield,
  Calendar,
  ChevronRight,
  PieChart as PieIcon,
  Filter,
  Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ─── StatCard Reutilizável ────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, trend, to }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 h-full"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-gray-800 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mt-2">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              {subtitle}
            </p>
          )}
        </div>
        <div className={`${color} p-4 rounded-2xl shadow-lg shadow-current/10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-4 text-[10px] font-bold uppercase tracking-wider ${trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend.value}% vs mês anterior
        </div>
      )}
    </motion.div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function FinancePage() {
  const { selectedCondominiumId } = useAuthStore();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['finance-balance', selectedCondominiumId],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const res = await api.get(`/finance/balance/${selectedCondominiumId}/yearly/${year}`);
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: defaulters, isLoading: defaultersLoading } = useQuery({
    queryKey: ['defaulters', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/finance/defaulters/${selectedCondominiumId}`);
      return res.data.data.defaulters;
    },
    enabled: !!selectedCondominiumId,
  });

  const chartData = ((balance?.months || []) as any[]).map((m: any) => ({
    name: MONTH_NAMES[m.month - 1],
    receitas: m.income,
    despesas: m.expenses,
    saldo: m.income - m.expenses,
  }));

  const currentMonth = chartData[new Date().getMonth()];
  const prevMonth = chartData[new Date().getMonth() - 1];

  const calculateTrend = (curr: number, prev: number) => {
    if (!prev) return { value: 0, isPositive: true };
    const diff = ((curr - prev) / prev) * 100;
    return { value: Math.abs(diff).toFixed(1), isPositive: diff >= 0 };
  };

  const isLoading = balanceLoading || defaultersLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
        <Skeleton className="h-[450px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Gestão Financeira</h1>
          <p className="text-gray-500 font-medium mt-1">
            Fluxo de caixa e controle de adimplência do condomínio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/finance/cobrancas"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nova Cobrança
          </Link>
          <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid de Métricas Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Mensal"
          value={formatCurrency(currentMonth?.receitas ?? 0)}
          subtitle="Entradas confirmadas"
          icon={TrendingUp}
          color="bg-emerald-500"
          trend={calculateTrend(currentMonth?.receitas ?? 0, prevMonth?.receitas ?? 0)}
        />
        <StatCard
          title="Despesa Mensal"
          value={formatCurrency(currentMonth?.despesas ?? 0)}
          subtitle="Saídas e manutenções"
          icon={TrendingDown}
          color="bg-rose-500"
          trend={calculateTrend(currentMonth?.despesas ?? 0, prevMonth?.despesas ?? 0)}
        />
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency((currentMonth?.receitas ?? 0) - (currentMonth?.despesas ?? 0))}
          subtitle="Disponível em caixa"
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatCard
          title="Inadimplência"
          value={((defaulters || []) as any[]).length}
          subtitle="Unidades com débitos"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
      </div>

      {/* Gráfico Principal e Sidebar de Inadimplentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Fluxo de Caixa */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Saúde Financeira — {new Date().getFullYear()}</h3>
              <p className="text-xs text-gray-400 font-medium">Histórico comparativo de receitas e despesas</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-500 uppercase tracking-widest">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-gray-500 uppercase tracking-widest">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => [formatCurrency(v), '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#10B981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRec)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="#EF4444" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorDes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card de Inadimplentes Recentes */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Lista de Débitos</h3>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">Unidades com maior saldo devedor</p>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-0">
            {((defaulters || []) as any[]).length > 0 ? (
              <div className="divide-y divide-gray-50">
                {((defaulters || []) as any[]).map((d: any) => (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={d.unitId} 
                    className="group flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-gray-400 group-hover:bg-white group-hover:text-amber-600 transition-all border border-transparent group-hover:border-amber-100">
                        {d.unit?.identifier}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 tracking-tight">
                          Bloco {d.unit?.block || '—'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          {d.chargesCount} pendências
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-rose-500">
                        {formatCurrency(d.totalAmount)}
                      </p>
                      <button className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Cobrar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full opacity-40">
                <Shield className="w-12 h-12 mb-4 text-emerald-500" />
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Condomínio em dia!</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-gray-50">
             <Link 
              to="/finance/cobrancas" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
             >
               Ver Todas as Unidades
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
