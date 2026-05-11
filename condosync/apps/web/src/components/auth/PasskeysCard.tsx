import { useState } from 'react';
import { KeyRound, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useWebAuthn } from '../../hooks/useWebAuthn';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function PasskeysCard() {
  const wa = useWebAuthn();
  const [deviceName, setDeviceName] = useState('');

  if (!wa.supported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Passkeys indisponíveis</p>
          <p className="text-amber-800 text-xs mt-1">
            Seu navegador não oferece suporte a WebAuthn. Use Chrome/Edge,
            Safari ou Firefox recentes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-gray-900">Passkeys / Biometria</p>
          <p className="text-xs text-muted-foreground">
            Entre sem senha usando a biometria do dispositivo ou uma chave de
            segurança. Cada dispositivo precisa ser registrado uma vez.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="Nome do dispositivo (ex: iPhone, Mac)"
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={async () => {
            const ok = await wa.register(deviceName || undefined);
            if (ok) setDeviceName('');
          }}
          disabled={wa.loading}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {wa.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Adicionar passkey
        </button>
      </div>

      {wa.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
          {wa.error}
        </div>
      )}

      {wa.credentials.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhuma passkey registrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {wa.credentials.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {c.deviceName || 'Dispositivo sem nome'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Adicionada em {formatDate(c.createdAt)}
                  {c.lastUsedAt && ` · Último uso ${formatDate(c.lastUsedAt)}`}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remover passkey "${c.deviceName ?? 'sem nome'}"?`)) {
                    wa.remove(c.id);
                  }
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasskeysCard;
