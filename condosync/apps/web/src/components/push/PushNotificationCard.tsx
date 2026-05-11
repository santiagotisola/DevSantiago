import { useState } from 'react';
import { Bell, BellOff, Loader2, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { usePushSubscription } from '../../hooks/usePushSubscription';

export function PushNotificationCard() {
  const push = usePushSubscription();
  const [testMsg, setTestMsg] = useState<string | null>(null);

  if (push.loading) {
    return (
      <div className="bg-white rounded-xl border p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando preferências de notificação…
      </div>
    );
  }

  if (!push.supported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Notificações push indisponíveis</p>
          <p className="text-amber-800 text-xs mt-1">
            Seu navegador não oferece suporte a notificações push. No iOS,
            adicione o app à tela inicial para habilitar.
          </p>
        </div>
      </div>
    );
  }

  if (push.permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3 text-sm">
        <BellOff className="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <p className="font-medium text-red-900">Notificações bloqueadas</p>
          <p className="text-red-800 text-xs mt-1">
            Você bloqueou notificações para este site. Para ativar, abra as
            configurações do navegador e libere notificações para CondoSync.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Notificações push</p>
            <p className="text-xs text-muted-foreground">
              {push.subscribed
                ? 'Você receberá avisos de encomendas, visitantes e cobranças mesmo com o app fechado.'
                : 'Ative para receber avisos em tempo real, mesmo com o app fechado.'}
            </p>
          </div>
        </div>
        {push.subscribed ? (
          <button
            onClick={() => push.unsubscribe()}
            disabled={push.loading}
            className="text-sm border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            Desativar
          </button>
        ) : (
          <button
            onClick={() => push.subscribe()}
            disabled={push.loading}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {push.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Ativar
          </button>
        )}
      </div>

      {push.subscribed && (
        <div className="flex items-center gap-2 pt-3 border-t">
          <button
            onClick={async () => {
              try {
                const r = await push.sendTest();
                setTestMsg(`Enviado para ${r.sent} dispositivo(s).`);
              } catch (err: any) {
                setTestMsg(err.message);
              }
              setTimeout(() => setTestMsg(null), 4000);
            }}
            className="text-xs flex items-center gap-1.5 border px-2.5 py-1 rounded-lg hover:bg-gray-50"
          >
            <Send className="w-3 h-3" />
            Enviar push de teste
          </button>
          {testMsg && (
            <span className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {testMsg}
            </span>
          )}
        </div>
      )}

      {push.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
          {push.error}
        </div>
      )}
    </div>
  );
}

export default PushNotificationCard;
