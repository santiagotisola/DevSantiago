import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

type PermissionState = NotificationPermission | 'unsupported';

interface PushState {
  supported: boolean;
  permission: PermissionState;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: PushState = {
  supported: false,
  permission: 'unsupported',
  subscribed: false,
  loading: true,
  error: null,
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Gerencia o ciclo de vida de push subscription no navegador:
 *  - Detecta suporte (Service Worker + Push API + Notification API).
 *  - Pede permissão.
 *  - Registra subscription contra o VAPID public key do backend.
 *  - Sincroniza com o backend (POST /push/subscribe e DELETE).
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushState>(initialState);

  const refresh = useCallback(async () => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (!supported) {
      setState({
        supported: false,
        permission: 'unsupported',
        subscribed: false,
        loading: false,
        error: null,
      });
      return;
    }

    const permission = Notification.permission;
    let subscribed = false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    } catch {
      // SW pode ainda não estar pronto — segue como não inscrito
    }
    setState({ supported: true, permission, subscribed, loading: false, error: null });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const keyResp = await api.get('/push/vapid-key');
      const { publicKey, enabled } = keyResp.data.data as { publicKey: string; enabled: boolean };
      if (!enabled || !publicKey) {
        throw new Error('Push notifications não configuradas no servidor.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((s) => ({ ...s, permission, subscribed: false, loading: false }));
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast: TS espera BufferSource mais estrito que Uint8Array
          // em alguns lib.dom builds. Runtime aceita ambos.
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
      });

      setState({ supported: true, permission: 'granted', subscribed: true, loading: false, error: null });
      return true;
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message ?? 'Erro ao ativar notificações',
      }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await api
          .delete('/push/subscribe', { data: { endpoint: subscription.endpoint } })
          .catch(() => undefined);
        await subscription.unsubscribe();
      }
      setState((s) => ({ ...s, subscribed: false, loading: false }));
      return true;
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message ?? 'Erro ao desativar notificações',
      }));
      return false;
    }
  }, []);

  const sendTest = useCallback(async () => {
    try {
      const r = await api.post('/push/test');
      return r.data.data as { sent: number; failed: number; pruned: number };
    } catch (err: any) {
      throw new Error(err?.response?.data?.message ?? 'Erro ao enviar push de teste');
    }
  }, []);

  return { ...state, subscribe, unsubscribe, refresh, sendTest };
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}
