import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Building2 className="w-8 h-8" />
          </div>
          <span className="text-2xl font-bold tracking-tight">CondoSync</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gestão inteligente para seu condomínio
          </h1>
          <p className="text-blue-200 text-lg">
            Controle completo de portaria, financeiro, manutenção e comunicação em uma única plataforma.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {[
              { label: 'Portaria Digital', desc: 'Visitantes e encomendas' },
              { label: 'Financeiro', desc: 'Boletos e inadimplência' },
              { label: 'Manutenção', desc: 'Chamados e agendamentos' },
              { label: 'Comunicação', desc: 'Avisos e enquetes' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="font-semibold">{item.label}</p>
                <p className="text-blue-200 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} CondoSync. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel direito - formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-blue-600">CondoSync</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
