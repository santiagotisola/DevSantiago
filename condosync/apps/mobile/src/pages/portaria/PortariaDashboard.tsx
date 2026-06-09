import { useQuery } from '@tanstack/react-query';
import { Shield, Package, Car, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function PortariaDashboard() {
  const { selectedCondominiumId } = useAuthStore();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: visitorsToday = [] } = useQuery({
    queryKey: ['dashboard-visitors', selectedCondominiumId, today],
    queryFn: async () => {
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}?date=${today}&limit=100`);
      const data = res.data.data as Array<{ id: string; entryAt?: string; exitAt?: string; preAuthorized: boolean }>;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 30000,
  });

  const { data: parcelsPending = [] } = useQuery({
    queryKey: ['dashboard-parcels', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}?limit=100`);
      const all = res.data.data as Array<{ id: string; deliveredAt?: string }>;
      const data = Array.isArray(all) ? all : [];
      return data.filter((p) => !p.deliveredAt);
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 60000,
  });

  const inside = Array.isArray(visitorsToday) ? visitorsToday.filter((v) => v.entryAt && !v.exitAt).length : 0;
  const expected = Array.isArray(visitorsToday) ? visitorsToday.filter((v) => v.preAuthorized && !v.entryAt).length : 0;
  const parcels = Array.isArray(parcelsPending) ? parcelsPending.length : 0;

  const stats = [
    { label: 'No condomínio', value: inside, icon: Shield, color: 'text-green-400', bg: 'bg-green-900/30', to: '/portaria/visitantes' },
    { label: 'Esperados', value: expected, icon: Users, color: 'text-blue-400', bg: 'bg-blue-900/30', to: '/portaria/visitantes' },
    { label: 'Encomendas', value: parcels, icon: Package, color: 'text-amber-400', bg: 'bg-amber-900/30', to: '/portaria/encomendas' },
    { label: 'Veículos', value: '—', icon: Car, color: 'text-slate-400', bg: 'bg-slate-700', to: '/portaria/veiculos' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Date */}
      <div>
        <p className="text-sm text-slate-400">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h2 className="text-xl font-bold text-white">Dashboard Portaria</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="btn-press bg-slate-800 rounded-2xl border border-slate-700 p-4 text-left"
          >
            <div className={['w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg].join(' ')}>
              <Icon size={22} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Ações rápidas</h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/portaria/visitantes')}
            className="btn-press w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Registrar visitante</p>
              <p className="text-xs text-slate-400">Registrar entrada/saída</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/portaria/encomendas')}
            className="btn-press w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Registrar encomenda</p>
              <p className="text-xs text-slate-400">{parcels} pendente{parcels !== 1 ? 's' : ''}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
