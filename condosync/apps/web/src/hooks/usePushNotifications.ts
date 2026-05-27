import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || subscribedRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        const { data } = await api.get('/notifications/vapid-public-key');
        const publicKey = data?.data?.publicKey;
        if (!publicKey) return;

        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }

        const subJson = subscription.toJSON();
        await api.post('/notifications/subscribe', {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        });

        subscribedRef.current = true;
      } catch (err) {
        console.error('[Push] Falha ao subscrever notificações push:', err);
      }
    })();
  }, [isAuthenticated]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
