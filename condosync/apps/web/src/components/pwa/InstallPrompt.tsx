import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'condosync.installPrompt.dismissedAt';
const RE_PROMPT_AFTER_DAYS = 14;

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const daysAgo = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysAgo < RE_PROMPT_AFTER_DAYS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // PWA já instalada — não mostra
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferred(evt);
      if (!isDismissedRecently()) {
        setOpen(true);
      }
    };
    const onInstalled = () => {
      setDeferred(null);
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!open || !deferred) return null;

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore storage errors (private mode / blocked storage)
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === 'accepted') {
      setOpen(false);
    } else {
      dismiss();
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-white border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Instalar CondoSync no seu dispositivo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Acesso rápido, notificações em tempo real e funciona offline.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
            >
              Instalar
            </button>
            <button
              onClick={dismiss}
              className="text-xs border px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
