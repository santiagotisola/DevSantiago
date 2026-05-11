import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface InvitationPreview {
  email: string;
  name: string | null;
  role: string;
  condominium: { id: string; name: string };
  unit: { id: string; identifier: string; block: string | null } | null;
  expiresAt: string;
  alreadyHasAccount: boolean;
  inviterName: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  DOORMAN: 'Porteiro',
  RESIDENT: 'Morador',
  SERVICE_PROVIDER: 'Prestador',
  COUNCIL_MEMBER: 'Conselheiro',
};

// Cliente sem interceptor de auth — convite é endpoint público
const publicApi = axios.create({ baseURL: '/api/v1' });

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [formError, setFormError] = useState('');

  const preview = useQuery<InvitationPreview>({
    queryKey: ['invite-preview', token],
    queryFn: async () => {
      const r = await publicApi.get(`/invitations/public/${token}`);
      return r.data.data.invitation;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (preview.data) {
      setName(preview.data.name ?? '');
    }
  }, [preview.data]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { password };
      if (name) payload.name = name;
      if (phone) payload.phone = phone;
      if (cpf) payload.cpf = cpf.replace(/\D/g, '');
      const r = await publicApi.post(`/invitations/public/${token}/accept`, payload);
      return r.data.data as { userId: string; condominiumId: string };
    },
    onSuccess: async () => {
      // Faz login automaticamente para evitar o usuário ter que digitar de novo
      try {
        const r = await publicApi.post('/auth/login', {
          email: preview.data!.email,
          password,
        });
        const { user, accessToken, refreshToken } = r.data.data;
        setAuth(user, accessToken, refreshToken);
        navigate('/', { replace: true });
      } catch {
        // Se o auto-login falhar, manda para a tela de login normal
        navigate('/login?invited=1', { replace: true });
      }
    },
  });

  function maskCpf(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  function maskPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'];
    return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score], color: colors[score] };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setFormError('Senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('As senhas não conferem.');
      return;
    }
    if (!agreedTerms) {
      setFormError('Você precisa aceitar os termos de uso para continuar.');
      return;
    }
    acceptMutation.mutate();
  }

  // ─── Tela de erro (token inválido/expirado/usado/revogado) ─────
  if (preview.isError) {
    const message =
      (preview.error as any)?.response?.data?.message ||
      'Não foi possível carregar este convite. O link pode ter expirado ou já ter sido utilizado.';
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-900 mb-1">Convite inválido</h2>
          <p className="text-sm text-red-700">{message}</p>
        </div>
        <div className="text-center">
          <a href="/login" className="text-sm text-blue-600 hover:underline">
            Ir para o login
          </a>
        </div>
      </div>
    );
  }

  if (preview.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const invitation = preview.data!;
  const pStrength = passwordStrength(password);
  const submitError =
    formError ||
    (acceptMutation.error as any)?.response?.data?.message ||
    (acceptMutation.error ? 'Não foi possível aceitar o convite. Tente novamente.' : '');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aceitar convite</h2>
        <p className="text-muted-foreground mt-1">
          Defina sua senha para entrar no CondoSync.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-1">
        <div className="flex items-center gap-2 text-blue-900 font-medium">
          <Building2 className="w-4 h-4" />
          {invitation.condominium.name}
        </div>
        <p className="text-blue-800">
          Você foi convidado por <strong>{invitation.inviterName}</strong> como{' '}
          <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>
          {invitation.unit && (
            <>
              {' '}— Unidade <strong>
                {invitation.unit.block ? `${invitation.unit.block}/` : ''}
                {invitation.unit.identifier}
              </strong>
            </>
          )}
          .
        </p>
        <p className="text-blue-700 text-xs">
          E-mail: <strong>{invitation.email}</strong>
          {invitation.alreadyHasAccount && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 rounded text-[10px] font-medium">
              Conta existente
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!invitation.alreadyHasAccount && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="name">
                Nome completo
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como deseja ser chamado"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="cpf">CPF</label>
                <input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="phone">Telefone</label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">
            Senha {' '}
            <span className="text-xs text-muted-foreground font-normal">
              (mínimo 8 caracteres)
            </span>
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="space-y-1">
              <div className="flex h-1 gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded ${i <= pStrength.score ? pStrength.color : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Força: {pStrength.label}</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="confirm">Confirme a senha</label>
          <input
            id="confirm"
            type={showPwd ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoComplete="new-password"
          />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-gray-700">
            Concordo com os{' '}
            <a href="/termos" target="_blank" className="text-blue-600 hover:underline">termos de uso</a>{' '}
            e a{' '}
            <a href="/privacidade" target="_blank" className="text-blue-600 hover:underline">política de privacidade</a>.
          </span>
        </label>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={acceptMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {acceptMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {acceptMutation.isPending ? 'Concluindo cadastro...' : 'Concluir cadastro e entrar'}
        </button>
      </form>
    </div>
  );
}

export default AcceptInvitePage;
