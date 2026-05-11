import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Loader2, KeyRound } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { loginWithPasskey } from '../../hooks/useWebAuthn';

function isLikelyCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 && !value.includes('@') && digits.length <= 11;
}
function isCompleteCpf(value: string): boolean {
  return value.replace(/\D/g, '').length === 11;
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Schema permissivo: identifier pode ser email ou CPF (11 dígitos).
const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Informe seu e-mail ou CPF')
    .refine(
      (v) => isValidEmail(v) || v.replace(/\D/g, '').length === 11,
      'Use um e-mail válido ou CPF com 11 dígitos',
    ),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const identifierValue = watch('identifier') ?? '';
  const looksLikeCpf = isLikelyCpf(identifierValue);

  function handleIdentifierChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw.includes('@')) {
      setValue('identifier', raw.toLowerCase(), { shouldValidate: true });
      return;
    }
    // Máscara de CPF se o usuário começou digitando números
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length > 0 && /^[\d.\-\s]+$/.test(raw)) {
      const d = digitsOnly.slice(0, 11);
      let masked = d;
      if (d.length > 3) masked = `${d.slice(0, 3)}.${d.slice(3)}`;
      if (d.length > 6) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
      if (d.length > 9) masked = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
      setValue('identifier', masked, { shouldValidate: true });
      return;
    }
    setValue('identifier', raw, { shouldValidate: true });
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const identifier = data.identifier.includes('@')
        ? data.identifier.trim().toLowerCase()
        : data.identifier.replace(/\D/g, '');
      const response = await api.post('/auth/login', {
        identifier,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao fazer login. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Entrar na sua conta</h2>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta. Digite suas credenciais para continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Identificador (email ou CPF) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="identifier">E-mail ou CPF</label>
          <input
            id="identifier"
            type="text"
            inputMode={looksLikeCpf ? 'numeric' : 'email'}
            autoComplete="username"
            placeholder="seu@email.com.br ou 000.000.000-00"
            className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            {...register('identifier')}
            onChange={handleIdentifierChange}
            value={identifierValue}
          />
          {errors.identifier && (
            <p className="text-destructive text-xs">{errors.identifier.message}</p>
          )}
          {looksLikeCpf && identifierValue && !isCompleteCpf(identifierValue) && (
            <p className="text-xs text-muted-foreground">
              Digite os 11 dígitos do CPF
            </p>
          )}
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="password">Senha</label>
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-xs">{errors.password.message}</p>
          )}
        </div>

        {/* Erro geral */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>

        {browserSupportsWebAuthn() && (
          <button
            type="button"
            onClick={async () => {
              try {
                setError('');
                const data = await loginWithPasskey(
                  identifierValue.trim() || undefined,
                );
                setAuth(data.user, data.accessToken, data.refreshToken);
                navigate('/');
              } catch (err: any) {
                setError(
                  err?.name === 'NotAllowedError'
                    ? 'Autenticação cancelada.'
                    : err?.response?.data?.message ??
                        err?.message ??
                        'Não foi possível entrar com passkey.',
                );
              }
            }}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Entrar com biometria / passkey
          </button>
        )}
      </form>

    </div>
  );
}
