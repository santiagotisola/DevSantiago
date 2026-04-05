import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Package,
  DollarSign,
  Bell,
  PawPrint,
  Ticket,
  CalendarCheck,
  FileText,
  Car,
  Users,
  LayoutDashboard,
  BarChart3,
  AlertTriangle,
  ShoppingBag,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Tile {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
  danger?: boolean;
}

const DOORMAN_ROLES = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];

export default function HomeGrid() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const isDoorman = DOORMAN_ROLES.includes(role);
  const isServiceProvider = role === 'SERVICE_PROVIDER';

  const residentTiles: Tile[] = [
    { to: '/visitantes', icon: Shield, label: 'Visitantes', color: 'text-blue-600', bg: 'bg-blue-50' },
    { to: '/encomendas', icon: Package, label: 'Encomendas', color: 'text-amber-600', bg: 'bg-amber-50' },
    { to: '/cobranças', icon: DollarSign, label: 'Cobranças', color: 'text-green-600', bg: 'bg-green-50' },
    { to: '/avisos', icon: Bell, label: 'Avisos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/pets', icon: PawPrint, label: 'Pets', color: 'text-pink-600', bg: 'bg-pink-50' },
    { to: '/chamados', icon: Ticket, label: 'Chamados', color: 'text-orange-600', bg: 'bg-orange-50' },
    { to: '/reservas', icon: CalendarCheck, label: 'Reservas', color: 'text-teal-600', bg: 'bg-teal-50' },
    { to: '/documentos', icon: FileText, label: 'Documentos', color: 'text-slate-600', bg: 'bg-slate-100' },
    { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const doormanTiles: Tile[] = [
    { to: '/portaria', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-600', bg: 'bg-blue-50' },
    { to: '/portaria/visitantes', icon: Shield, label: 'Visitantes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { to: '/portaria/encomendas', icon: Package, label: 'Encomendas', color: 'text-amber-600', bg: 'bg-amber-50' },
    { to: '/portaria/veiculos', icon: Car, label: 'Veículos', color: 'text-gray-600', bg: 'bg-gray-100' },
    { to: '/moradores', icon: Users, label: 'Moradores', color: 'text-teal-600', bg: 'bg-teal-50' },
    { to: '/avisos', icon: Bell, label: 'Avisos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/relatorios', icon: BarChart3, label: 'Relatórios', color: 'text-green-600', bg: 'bg-green-50' },
    {
      to: '/panico',
      icon: AlertTriangle,
      label: '🚨 PÂNICO',
      color: 'text-white',
      bg: 'bg-red-600',
      danger: true,
    },
  ];

  const serviceTiles: Tile[] = [
    { to: '/avisos', icon: Bell, label: 'Avisos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/chamados', icon: Ticket, label: 'Chamados', color: 'text-orange-600', bg: 'bg-orange-50' },
    { to: '/manutencao', icon: Wrench, label: 'Manutenção', color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const tiles = isDoorman ? doormanTiles : isServiceProvider ? serviceTiles : residentTiles;

  return (
    <div className="p-4">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">Bem-vindo(a),</p>
        <h2 className="text-xl font-bold text-gray-900">{user?.name?.split(' ')[0] ?? 'Usuário'}</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ to, icon: Icon, label, color, bg, danger }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={[
              'btn-press flex flex-col items-center justify-center gap-2 rounded-2xl p-5 shadow-sm border',
              danger ? 'border-red-500 shadow-red-100' : 'border-gray-100 bg-white',
            ].join(' ')}
          >
            <div className={['w-12 h-12 rounded-xl flex items-center justify-center', bg].join(' ')}>
              <Icon size={26} className={color} />
            </div>
            <span className={['text-sm font-medium', danger ? 'text-red-700' : 'text-gray-700'].join(' ')}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
