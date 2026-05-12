import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface AcceptanceStatus {
  terms: { id: string; version: string; accepted: boolean } | null;
  privacy: { id: string; version: string; accepted: boolean } | null;
  missing: Array<{ id: string; kind: string; version: string }>;
}

export function LgpdCard() {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const status = useQuery<AcceptanceStatus>({
    queryKey: ['lgpd-status'],
    queryFn: async () => (await api.get('/lgpd/status')).data.data,
  });

  const acceptMut = useMutation({
    mutationFn: (termsVersionId: string) => api.post('/lgpd/accept', { termsVersionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lgpd-status'] }),
  });

  async function handleExport() {
    setExporting(true);
    try {
      const r = await api.get('/lgpd/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `condosync-meus-dados-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (status.isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando LGPD…
      </div>
    );
  }

  const s = status.data!;
  const missing = s.missing.length;

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-gray-900">Privacidade e termos (LGPD)</p>
          <p className="text-xs text-muted-foreground">
            Veja seus dados, controle aceites e exporte tudo.
          </p>
        </div>
      </div>

      {missing > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">
              {missing === 1 ? 'Há 1 termo pendente' : `Há ${missing} termos pendentes`}
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Aceite para continuar usando o sistema com a versão mais recente das políticas.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {s.missing.map((m) => (
                <button
                  key={m.id}
                  onClick={() => acceptMut.mutate(m.id)}
                  disabled={acceptMut.isPending}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  Aceitar{' '}
                  {m.kind === 'terms_of_use' ? 'Termos de Uso' : 'Política de Privacidade'} v
                  {m.version}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-gray-700">
            <FileText className="w-4 h-4 text-gray-400" /> Termos de Uso
            {s.terms && (
              <span className="text-xs text-muted-foreground">v{s.terms.version}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {s.terms?.accepted ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Aceito
              </span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                Não aceito
              </span>
            )}
            <a
              href="/termos/terms_of_use"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver
            </a>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-gray-700">
            <FileText className="w-4 h-4 text-gray-400" /> Política de Privacidade
            {s.privacy && (
              <span className="text-xs text-muted-foreground">v{s.privacy.version}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {s.privacy?.accepted ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Aceito
              </span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                Não aceito
              </span>
            )}
            <a
              href="/termos/privacy_policy"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver
            </a>
          </div>
        </div>
      </div>

      <div className="border-t pt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Direito de portabilidade (LGPD art. 18, II): baixar tudo o que armazenamos sobre você.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-xs flex items-center gap-1.5 border px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Exportar meus dados
        </button>
      </div>
    </div>
  );
}

export default LgpdCard;
