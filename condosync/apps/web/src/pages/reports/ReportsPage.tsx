import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { BarChart3, Loader2, Users, DollarSign, Wrench, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency } from '../../lib/utils';

const TABS = [
  { id: 'visitors', label: 'Visitantes', icon: Users },
  { id: 'financial', label: 'Financeiro', icon: DollarSign },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'occupancy', label: 'Ocupação', icon: Building2 },
];

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ReportsPage() {
  const { selectedCondominiumId } = useAuthStore();
  const [activeTab, setActiveTab] = useState('visitors');

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeTab, selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/reports/${activeTab}/${selectedCondominiumId}`);
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const renderVisitors = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Total', data?.total], ['Hoje', data?.today], ['Esta semana', data?.thisWeek], ['Este mês', data?.thisMonth]].map(([label, value]) => (
          <div key={label as string} className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-blue-600">{value ?? 0}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>
        ))}
      </div>
    </div>
  );

  const renderFinancial = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[['Receitas', data?.income, 'text-green-600'], ['Despesas', data?.expenses, 'text-red-600'], ['Saldo', data?.balance, 'text-blue-600'], ['Cobranças', data?.totalCharges, 'text-gray-700'], ['Arrecadado', data?.collected, 'text-green-700'], ['Taxa de adimplência', `${data?.collectionRate?.toFixed(1) ?? 0}%`, 'text-blue-700']].map(([label, value, color]) => (
          <div key={label as string} className="bg-white border rounded-xl p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-xl font-bold mt-1 ${color}`}>{typeof value === 'string' && value.includes('%') ? value : formatCurrency(Number(value ?? 0))}</p></div>
        ))}
      </div>
    </div>
  );

  const renderMaintenance = () => {
    const byStatus = Object.entries(data?.byStatus || {}).map(([name, value]) => ({ name, value: Number(value) }));
    const byPriority = Object.entries(data?.byPriority || {}).map(([name, value]) => ({ name, value: Number(value) }));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Por Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{byStatus.map((_:any, i:number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Por Prioridade</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byPriority}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {data?.avgResolutionHours && <p className="text-sm text-muted-foreground">Tempo médio de resolução: <strong>{data.avgResolutionHours.toFixed(1)}h</strong></p>}
      </div>
    );
  };

  const renderOccupancy = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[['Total de Unidades', data?.totalUnits], ['Ocupadas', data?.occupied], ['Vagas', data?.vacant], ['Taxa de ocupação', `${data?.occupancyRate?.toFixed(1) ?? 0}%`]].map(([label, value]) => (
        <div key={label as string} className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-blue-600">{value ?? 0}</p><p className="text-sm text-muted-foreground mt-1">{label}</p></div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
    if (!data) return <div className="flex items-center justify-center h-48 text-muted-foreground">Sem dados disponíveis</div>;
    switch (activeTab) {
      case 'visitors': return renderVisitors();
      case 'financial': return renderFinancial();
      case 'maintenance': return renderMaintenance();
      case 'occupancy': return renderOccupancy();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e estatísticas do condomínio</p>
      </div>

      <div className="flex border-b gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-gray-700'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
