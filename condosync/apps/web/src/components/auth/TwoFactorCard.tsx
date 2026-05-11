import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Loader2, AlertTriangle, Copy, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';

interface Status {
  enabled: boolean;
  backupCodesRemaining: number;
  backupCodesTotal: number;
}

export function TwoFactorCard() {
  const qc = useQueryClient();
  const status = useQuery<Status>({
    queryKey: ['2fa-status'],
    queryFn: async () => (await api.get('/2fa/status')).data.data,
  });

  const [setupData, setSetupData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const setupMut = useMutation({
    mutationFn: () => api.post('/2fa/setup'),
    onSuccess: (r) => {
      setError('');
      setSetupData(r.data.data);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erro ao iniciar setup'),
  });

  const verifyMut = useMutation({
    mutationFn: () => api.post('/2fa/verify', { code: verifyCode.replace(/\s/g, '') }),
    onSuccess: (r) => {
      setBackupCodes(r.data.data.backupCodes);
      setSetupData(null);
      setVerifyCode('');
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Código inválido'),
  });

  const disableMut = useMutation({
    mutationFn: () => api.post('/2fa/disable', { code: disableCode.replace(/\s/g, '') }),
    onSuccess: () => {
      setShowDisable(false);
      setDisableCode('');
      setBackupCodes(null);
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Código inválido'),
  });

  const regenMut = useMutation({
    mutationFn: () => api.post('/2fa/regenerate-backup-codes'),
    onSuccess: (r) => {
      setBackupCodes(r.data.data.backupCodes);
      qc.invalidateQueries({ queryKey: ['2fa-status'] });
    },
  });

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  function copyCodes() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => setCopied(true));
  }

  if (status.isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando 2FA…
      </div>
    );
  }

  const s = status.data!;

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-start gap-3">
        {s.enabled ? (
          <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
        ) : (
          <ShieldOff className="w-5 h-5 text-gray-400 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="font-medium text-gray-900">Autenticação em dois fatores (2FA)</p>
          <p className="text-xs text-muted-foreground">
            {s.enabled
              ? `Ativo. ${s.backupCodesRemaining}/${s.backupCodesTotal} códigos de backup restantes.`
              : 'Proteja sua conta exigindo um código de 6 dígitos do app autenticador no login.'}
          </p>
        </div>
        {!s.enabled && !setupData && (
          <button
            onClick={() => setupMut.mutate()}
            disabled={setupMut.isPending}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {setupMut.isPending ? 'Iniciando…' : 'Ativar'}
          </button>
        )}
        {s.enabled && (
          <button
            onClick={() => setShowDisable(true)}
            className="text-sm border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
          >
            Desativar
          </button>
        )}
      </div>

      {/* Setup step */}
      {setupData && !backupCodes && (
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm">
            1. Abra seu app autenticador (Google Authenticator, Authy, 1Password) e escaneie o QR:
          </p>
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
            <img src={setupData.qrDataUrl} alt="QR 2FA" className="w-44 h-44" />
          </div>
          <p className="text-xs text-muted-foreground">
            Ou digite manualmente esta chave:{' '}
            <code className="bg-gray-100 px-1 rounded font-mono">{setupData.secret}</code>
          </p>
          <p className="text-sm">2. Digite o código de 6 dígitos exibido:</p>
          <div className="flex gap-2">
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="000000"
              maxLength={8}
              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => verifyMut.mutate()}
              disabled={verifyMut.isPending || verifyCode.length < 6}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {verifyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Backup codes display */}
      {backupCodes && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Guarde estes códigos.</strong> Eles aparecem uma única vez e cada um pode ser
              usado apenas uma vez se você perder acesso ao app autenticador.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-gray-50 rounded-lg p-3">
            {backupCodes.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCodes}
              className="text-xs flex items-center gap-1.5 border px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar todos'}
            </button>
            <button
              onClick={() => setBackupCodes(null)}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Já guardei os códigos
            </button>
          </div>
        </div>
      )}

      {/* Regenerate backup codes */}
      {s.enabled && !backupCodes && (
        <div className="border-t pt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Perdeu seus códigos de backup?
          </p>
          <button
            onClick={() => regenMut.mutate()}
            disabled={regenMut.isPending}
            className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {regenMut.isPending ? 'Gerando…' : 'Regenerar códigos'}
          </button>
        </div>
      )}

      {/* Disable confirm modal-like */}
      {showDisable && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium">Desativar 2FA</p>
            <button onClick={() => setShowDisable(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite um código atual do app ou um código de backup para confirmar:
          </p>
          <div className="flex gap-2">
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000 ou XXXXX-XXXXX"
              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <button
              onClick={() => disableMut.mutate()}
              disabled={disableMut.isPending || disableCode.length < 6}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {disableMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desativar'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

export default TwoFactorCard;
