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

  const { data: visitorsToday } = useQuery({
    queryKey: ['dashboard-visitors', selectedCondominiumId, today],
    queryFn: async () => {
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}?date=${today}&limit=100`);
      return res.data.data as Array<{ id: string; entryAt?: string; exitAt?: string; preAuthorized: boolean }>;
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 30000,
  });

  const { data: parcelsPending } = useQuery({
    queryKey: ['dashboard-parcels', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}?limit=100`);
      const all = res.data.data as Array<{ id: string; deliveredAt?: string }>;
      return all.filter((p) => !p.deliveredAt);
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 60000,
  });

  const inside = (visitorsToday ?? []).filter((v) => v.entryAt && !v.exitAt).length;
  const expected = (visitorsToday ?? []).filter((v) => v.preAuthorized && !v.entryAt).length;
  const parcels = (parcelsPending ?? []).length;

  const stats = [
    { label: 'No condomínio', value: inside, icon: Shield, color: 'text-green-600', bg: 'bg-green-50', to: '/portaria/visitantes' },
    { label: 'Esperados', value: expected, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', to: '/portaria/visitantes' },
    { label: 'Encomendas', value: parcels, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', to: '/portaria/encomendas' },
    { label: 'Veículos', value: '—', icon: Car, color: 'text-gray-600', bg: 'bg-gray-100', to: '/portaria/veiculos' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Date */}
      <div>
        <p className="text-sm text-gray-500">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h2 className="text-xl font-bold text-gray-900">Dashboard Portaria</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="btn-press bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left"
          >
            <div className={['w-10 h-10 rounded-xl flex items-center justify-center mb-3', bg].join(' ')}>
              <Icon size={22} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ações rápidas</h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/portaria/visitantes')}
            className="btn-press w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Registrar visitante</p>
              <p className="text-xs text-gray-500">Registrar entrada/saída</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/portaria/encomendas')}
            className="btn-press w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Registrar encomenda</p>
              <p className="text-xs text-gray-500">{parcels} pendente{parcels !== 1 ? 's' : ''}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
