import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Shield, Package, Bell, User, AlertTriangle, Ticket, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const DOORMAN_ROLES = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];
const RESIDENT_ROLES = ['RESIDENT'];

export default function BottomNav() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';

  const isDoorman = DOORMAN_ROLES.includes(role);
  const isResident = RESIDENT_ROLES.includes(role);
  const isServiceProvider = role === 'SERVICE_PROVIDER';

  type Tab = { to: string; icon: LucideIcon; label: string; danger?: boolean };

  const residentTabs: Tab[] = [
    { to: '/', icon: LayoutDashboard, label: 'Início' },
    { to: '/visitantes', icon: Shield, label: 'Visitas' },
    { to: '/encomendas', icon: Package, label: 'Encomendas' },
    { to: '/panico', icon: AlertTriangle, label: 'PÂNICO', danger: true },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ];

  const doormanTabs: Tab[] = [
    { to: '/', icon: LayoutDashboard, label: 'Início' },
    { to: '/portaria/visitantes', icon: Shield, label: 'Visitantes' },
    { to: '/portaria/encomendas', icon: Package, label: 'Entregas' },
    { to: '/panico', icon: AlertTriangle, label: 'PÂNICO', danger: true },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ];

  const serviceTabs: Tab[] = [
    { to: '/', icon: LayoutDashboard, label: 'Início' },
    { to: '/avisos', icon: Bell, label: 'Avisos' },
    { to: '/chamados', icon: Ticket, label: 'Chamados' },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ];

  const tabs = isDoorman ? doormanTabs : isServiceProvider ? serviceTabs : residentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 safe-bottom">
      <div className="flex items-stretch h-16">
        {tabs.map(({ to, icon: Icon, label, danger }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                danger
                  ? isActive
                    ? 'text-red-400 bg-red-950'
                    : 'text-red-400'
                  : isActive
                  ? 'text-blue-400 bg-slate-700'
                  : 'text-slate-400 hover:text-slate-300',
              ].join(' ')
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
