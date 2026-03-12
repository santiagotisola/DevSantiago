import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../lib/utils';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function FinancePage() {
  const { selectedCondominiumId } = useAuthStore();

  const { data: balance, isLoading } = useQuery({
    queryKey: ['finance-balance', selectedCondominiumId],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const res = await api.get(`/finance/balance/${selectedCondominiumId}/yearly/${year}`);
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: defaulters } = useQuery({
    queryKey: ['defaulters', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/finance/defaulters/${selectedCondominiumId}`);
      return res.data.data.defaulters;
    },
    enabled: !!selectedCondominiumId,
  });

  const chartData = ((balance?.months || []) as any[]).map((m: any) => ({
    name: MONTH_NAMES[m.month - 1],
    Receitas: m.income,
    Despesas: m.expenses,
  }));

  const currentMonth = chartData[new Date().getMonth()];

  const cards = [
    { label: 'Receitas (mês)', value: currentMonth?.Receitas ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Despesas (mês)', value: currentMonth?.Despesas ?? 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Saldo (mês)', value: (currentMonth?.Receitas ?? 0) - (currentMonth?.Despesas ?? 0), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Inadimplentes', value: ((defaulters || []) as any[]).length, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', currency: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Visão geral das finanças do condomínio</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{c.label}</span>
                  <div className={`p-1.5 rounded-lg ${c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>
                  {c.currency === false ? c.value : formatCurrency(c.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-base font-semibold mb-4">Receitas vs Despesas — {new Date().getFullYear()}</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {((defaulters || []) as any[]).length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <h2 className="font-semibold text-sm">Inadimplentes</h2>
              </div>
              <div className="divide-y">
                {((defaulters || []) as any[]).slice(0, 10).map((d: any) => (
                  <div key={d.unitId} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <p className="font-medium">Unid. {d.unit?.identifier}{d.unit?.block ? ' / Bloco ' + d.unit.block : ''}</p>
                      <p className="text-xs text-muted-foreground">{d.chargesCount} cobrança(s) em aberto</p>
                    </div>
                    <p className="font-semibold text-red-600">{formatCurrency(d.totalAmount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
