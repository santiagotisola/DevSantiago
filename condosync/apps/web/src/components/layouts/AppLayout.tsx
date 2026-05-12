import { Link, Outlet } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';
import { AiAssistantChat } from '../ai/AiAssistantChat';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ShieldAlert } from 'lucide-react';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mustEnable2FA = useAuthStore((s) => s.mustEnable2FA);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

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
              to="/configuracoes/seguranca"
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

      {/* Assistente IA flutuante (visível apenas para MGMT) */}
      <AiAssistantChat />
    </div>
  );
}
