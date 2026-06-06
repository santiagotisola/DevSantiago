import { Outlet } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';
import { AiAssistantChat } from '../ai/AiAssistantChat';
import { SkipLink } from '../accessibility/SkipLink';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = useAuthStore((s) => s.user);
  const isTwoFactorEnabled = user?.twoFactorEnabled === true;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SkipLink />

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Banner 2FA - Mostrar se não configurado */}
        {!isTwoFactorEnabled && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-900">
                Seu plano exige autenticação em dois fatores. Configure antes de acessar áreas administrativas sensíveis.
              </p>
            </div>
            <Link
              to="/perfil#two-factor"
              className="px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
            >
              Configurar 2FA
            </Link>
          </div>
        )}

        <main id="main-content" role="main" className="flex-1 overflow-y-auto">
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
