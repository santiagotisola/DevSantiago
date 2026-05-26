import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Building2, Accessibility, Globe, Info, ShieldCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

interface DefaultCredentials {
  email: string;
  password: string;
}

const DEFAULT_CREDENTIALS_KEY = 'condosync-default-login-mobile';
const DEFAULT_HOMOLOG_CREDENTIALS: DefaultCredentials = {
  email: 'atendimentveredasbosque@gmail.com',
  password: 'Admin@2026',
};

function getInitialCredentials(): DefaultCredentials {
  if (typeof window === 'undefined') return { email: '', password: '' };

  const isHomologOrLocal = ['homologacao', 'localhost'].includes(window.location.hostname);
  if (!isHomologOrLocal) return { email: '', password: '' };

  try {
    const stored = window.localStorage.getItem(DEFAULT_CREDENTIALS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DefaultCredentials>;
      if (parsed.email && parsed.password) {
        return { email: parsed.email, password: parsed.password };
      }
    }
  } catch {
    // Ignora erro de parse e usa o padrão de homologação.
  }

  return DEFAULT_HOMOLOG_CREDENTIALS;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const initialCredentials = getInitialCredentials();
  const [email, setEmail] = useState(initialCredentials.email);
  const [password, setPassword] = useState(initialCredentials.password);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);

      if (typeof window !== 'undefined') {
        const isHomologOrLocal = ['homologacao', 'localhost'].includes(window.location.hostname);
        if (isHomologOrLocal) {
          window.localStorage.setItem(
            DEFAULT_CREDENTIALS_KEY,
            JSON.stringify({ email, password }),
          );
        }
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Credenciais inválidas';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900">
      {/* Banner institucional */}
      <div className="w-full bg-blue-800 py-6 flex flex-col items-center shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={36} className="text-white drop-shadow" />
          <h1 className="text-2xl font-bold text-white tracking-wide">CondoSync</h1>
        </div>
        <p className="text-white text-sm">Gestão de Condomínios Inteligente</p>
      </div>

      {/* Grid de atalhos/serviços */}
      <div className="grid grid-cols-2 gap-4 px-6 mt-6 mb-2">
        <a href="http://homologacao/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center bg-white/10 rounded-xl p-3 hover:bg-blue-700/30 transition">
          <LogIn size={24} className="text-blue-400 mb-1" />
          <span className="text-xs text-white">Acesso ao Sistema</span>
        </a>
        <a href="https://acessoainformacao.aparecida.go.gov.br/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center bg-white/10 rounded-xl p-3 hover:bg-green-700/30 transition">
          <ShieldCheck size={24} className="text-green-400 mb-1" />
          <span className="text-xs text-white">Portal da Transparência</span>
        </a>
        <a href="mailto:suporte@condosync.app" className="flex flex-col items-center bg-white/10 rounded-xl p-3 hover:bg-blue-500/30 transition">
          <Mail size={24} className="text-blue-300 mb-1" />
          <span className="text-xs text-white">Contato</span>
        </a>
        <a href="https://vlibras.gov.br/app/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center bg-white/10 rounded-xl p-3 hover:bg-purple-700/30 transition">
          <Accessibility size={24} className="text-purple-400 mb-1" />
          <span className="text-xs text-white">Acessibilidade</span>
        </a>
      </div>

      {/* Card de login */}
      <div id="login" className="bg-white/5 rounded-2xl p-6 shadow-2xl border border-blue-700 mx-4 mt-4">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <LogIn size={20} /> Entrar no sistema
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">E-mail ou CPF</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com ou 000.000.000-00"
              className="w-full border border-blue-600 bg-blue-900/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-blue-600 bg-blue-900/60 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full bg-blue-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-blue-800"
          >
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Bloco de acessibilidade */}
      <div className="flex justify-center gap-4 mt-6 mb-2 text-xs">
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Accessibility size={14}/>LIBRAS</button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Globe size={14}/>Aumentar Fonte</button>
        <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-700/80 text-white hover:bg-blue-800"><Info size={14}/>Alto Contraste</button>
      </div>

      {/* Rodapé institucional */}
      <footer className="mt-auto py-4 text-center text-xs text-white opacity-90">
        <div className="mb-1">Rua Gervásio Pinheiro, APM Residencial Solar Central Park</div>
        <div>CEP: 74.968-500 &nbsp;|&nbsp; Telefone: (62) 3545-5800</div>
        <div className="mt-1">© {new Date().getFullYear()} CondoSync. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
