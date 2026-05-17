import { Outlet } from 'react-router-dom';
import MobileHeader from '../navigation/MobileHeader';
import BottomNav from '../navigation/BottomNav';
import { Building2, Accessibility, Globe, Info } from 'lucide-react';

interface MobileLayoutProps {
  title: string;
  showBack?: boolean;
  headerRight?: React.ReactNode;
}

export default function MobileLayout({ title, showBack, headerRight }: MobileLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900">
      {/* Banner institucional fixo */}
      <div className="w-full bg-blue-800 py-4 flex flex-col items-center shadow-lg z-50">
        <div className="flex items-center gap-3 mb-1">
          <Building2 size={28} className="text-white drop-shadow" />
          <h1 className="text-lg font-bold text-white tracking-wide">CondoSync</h1>
        </div>
        <p className="text-blue-100 text-xs">Gestão de Condomínios Inteligente</p>
      </div>

      {/* offset para header (mantém compatibilidade com MobileHeader) */}
      <div className="h-4" />

      {/* Bloco de acessibilidade global */}
      <div className="flex justify-center gap-3 mt-2 mb-2 text-xs">
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Accessibility size={14}/>LIBRAS</button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Globe size={14}/>Aumentar Fonte</button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Info size={14}/>Alto Contraste</button>
      </div>

      {/* Conteúdo principal */}
      <MobileHeader title={title} showBack={showBack} rightNode={headerRight} />
      <main className="flex-1 overflow-y-auto pt-14 pb-20 scroll-area">
        <Outlet />
      </main>
      <BottomNav />

      {/* Rodapé institucional global */}
      <footer className="mt-auto py-3 text-center text-xs text-blue-200 opacity-80 bg-blue-900/80">
        <div className="mb-1">Rua Gervásio Pinheiro, APM Residencial Solar Central Park</div>
        <div>CEP: 74.968-500 &nbsp;|&nbsp; Telefone: (62) 3545-5800</div>
        <div className="mt-1">© {new Date().getFullYear()} CondoSync. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
