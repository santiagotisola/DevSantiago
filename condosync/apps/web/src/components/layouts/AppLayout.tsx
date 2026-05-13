import { Link, Outlet } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';
import { AiAssistantChat } from '../ai/AiAssistantChat';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert } from 'lucide-react';

const COLLAPSED_KEY = 'condosync-sidebar-collapsed';

export function AppLayout() {
  // Mobile: drawer aberto por padrão a partir de lg+; em telas pequenas começa fechado.
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: mini-rail persistido no localStorage.
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, desktopCollapsed ? '1' : '0');
    } catch {
      // ignore quota / disabled storage
    }
  }, [desktopCollapsed]);

  // Resize mobile→desktop com drawer aberto deixava o aside "preso" em
  // translate-x-0 sobreposto ao layout (sem overlay porque overlay é
  // lg:hidden). Zerar mobileOpen ao cruzar 1024px resolve.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mustEnable2FA = useAuthStore((s) => s.mustEnable2FA);

  function handleMenuClick() {
    // lg+ alterna mini-rail; abaixo de lg alterna drawer mobile.
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setDesktopCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={desktopCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={handleMenuClick} />

        {mustEnable2FA && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Seu plano exige autenticação em dois fatores. Configure antes de
                acessar áreas administrativas sensíveis.
              </span>
            </div>
            <Link
              to="/perfil#two-factor"
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Configurar 2FA
            </Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <AiAssistantChat />
    </div>
  );
}
