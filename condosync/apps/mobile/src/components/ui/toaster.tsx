import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const toastState = {
  messages: [] as ToastMessage[],
  listeners: [] as (() => void)[],
  subscribe: (listener: () => void) => {
    toastState.listeners.push(listener);
    return () => {
      toastState.listeners = toastState.listeners.filter((l) => l !== listener);
    };
  },
  notify: () => {
    toastState.listeners.forEach((l) => l());
  },
};

export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const id = Math.random().toString(36).substring(7);
  toastState.messages.push({ id, message, type });
  toastState.notify();

  setTimeout(() => {
    toastState.messages = toastState.messages.filter((m) => m.id !== id);
    toastState.notify();
  }, 3000);
};

export const Toaster = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  React.useEffect(() => {
    const unsubscribe = toastState.subscribe(() => {
      setMessages([...toastState.messages]);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={['flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white animate-in slide-in-from-bottom', 
            msg.type === 'success' ? 'bg-green-500' : msg.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          ].join(' ')}
        >
          {msg.type === 'success' && <CheckCircle size={18} />}
          {msg.type === 'error' && <AlertCircle size={18} />}
          {msg.type === 'info' && <AlertCircle size={18} />}
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
};
