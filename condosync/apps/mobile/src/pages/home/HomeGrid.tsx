import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Package,
  DollarSign,
  Bell,
  PawPrint,
  Ticket,
  Car,
  LayoutDashboard,
  AlertTriangle,
  ShoppingBag,
  LogOut,
  MessageCircle,
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
  const { user, logout } = useAuthStore();
  const role = user?.role ?? '';
  const isDoorman = DOORMAN_ROLES.includes(role);
  const isServiceProvider = role === 'SERVICE_PROVIDER';

  const handleQuickLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const residentTiles: Tile[] = [
    { to: '/visitantes', icon: Shield, label: 'Visitantes', color: 'text-blue-600', bg: 'bg-blue-50' },
    { to: '/encomendas', icon: Package, label: 'Encomendas', color: 'text-amber-600', bg: 'bg-amber-50' },
    { to: '/cobranças', icon: DollarSign, label: 'Cobranças', color: 'text-green-600', bg: 'bg-green-50' },
    { to: '/avisos', icon: Bell, label: 'Avisos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/pets', icon: PawPrint, label: 'Pets', color: 'text-pink-600', bg: 'bg-pink-50' },
    { to: '/chamados', icon: Ticket, label: 'Chamados', color: 'text-orange-600', bg: 'bg-orange-50' },
    { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    {
      to: '/panico',
      icon: AlertTriangle,
      label: '🚨 PÂNICO',
      color: 'text-white',
      bg: 'bg-red-600',
      danger: true,
    },
  ];

  const doormanTiles: Tile[] = [
    { to: '/portaria', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-600', bg: 'bg-blue-50' },
    { to: '/portaria/visitantes', icon: Shield, label: 'Visitantes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { to: '/portaria/encomendas', icon: Package, label: 'Encomendas', color: 'text-amber-600', bg: 'bg-amber-50' },
    { to: '/portaria/veiculos', icon: Car, label: 'Veículos', color: 'text-gray-600', bg: 'bg-gray-100' },
    { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'text-green-600', bg: 'bg-green-50' },
    { to: '/avisos', icon: Bell, label: 'Avisos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
  ];

  const tiles = isDoorman ? doormanTiles : isServiceProvider ? serviceTiles : residentTiles;

  return (
    <div className="p-4">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-slate-400">Bem-vindo(a),</p>
        <h2 className="text-xl font-bold text-white">{user?.name?.split(' ')[0] ?? 'Usuário'}</h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ to, icon: Icon, label, color, bg, danger }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={[
              'btn-press flex flex-col items-center justify-center gap-2 rounded-2xl p-5 shadow-sm border',
              danger ? 'border-red-500 shadow-red-100 bg-red-950/40' : 'border-slate-600 bg-slate-700/50',
            ].join(' ')}
          >
            <div className={['w-12 h-12 rounded-xl flex items-center justify-center', bg].join(' ')}>
              <Icon size={26} className={color} />
            </div>
            <span className={['text-sm font-medium', danger ? 'text-red-300' : 'text-slate-100'].join(' ')}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={handleQuickLogout}
        className="btn-press mt-4 w-full bg-red-950/40 text-red-300 border border-red-600 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sair da conta
      </button>
    </div>
  );
}
