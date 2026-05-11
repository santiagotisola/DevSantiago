import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Mostra banner discreto quando o navegador detecta perda de conexão.
 * Some sozinho ao voltar online. Útil em PWA porque dá feedback ao
 * usuário sobre por que as ações deixaram de funcionar.
 */
export function OnlineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-xs font-medium py-1.5 px-3 flex items-center justify-center gap-2 shadow"
    >
      <WifiOff className="w-3.5 h-3.5" />
      Você está offline. Algumas ações ficarão indisponíveis até reconectar.
    </div>
  );
}

export default OnlineIndicator;
