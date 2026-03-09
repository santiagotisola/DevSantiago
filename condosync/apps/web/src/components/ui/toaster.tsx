import * as React from 'react';

interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const toastQueue: ((t: ToastData) => void)[] = [];
let toastId = 0;

export function toast(message: string, type: ToastData['type'] = 'info') {
  const t: ToastData = { id: String(++toastId), message, type };
  toastQueue.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    const handler = (t: ToastData) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    toastQueue.push(handler);
    return () => {
      const idx = toastQueue.indexOf(handler);
      if (idx > -1) toastQueue.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white min-w-[220px] max-w-xs transition-all animate-in slide-in-from-bottom-2 ${
            t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
