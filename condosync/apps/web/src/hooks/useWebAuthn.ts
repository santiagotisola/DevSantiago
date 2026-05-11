import { useCallback, useEffect, useState } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { api } from '../services/api';

interface Credential {
  id: string;
  credentialId: string;
  deviceName: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  transports: string[];
}

interface State {
  supported: boolean;
  loading: boolean;
  credentials: Credential[];
  error: string | null;
}

export function useWebAuthn() {
  const [state, setState] = useState<State>({
    supported: browserSupportsWebAuthn(),
    loading: true,
    credentials: [],
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!browserSupportsWebAuthn()) {
      setState((s) => ({ ...s, supported: false, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await api.get('/webauthn/credentials');
      setState({
        supported: true,
        loading: false,
        credentials: r.data.data.credentials as Credential[],
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err?.message ?? 'Erro' }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(async (deviceName?: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const begin = await api.post('/webauthn/register/begin');
      const options = begin.data.data.options;
      const attestation = await startRegistration({ optionsJSON: options });
      await api.post('/webauthn/register/verify', { response: attestation, deviceName });
      await refresh();
      return true;
    } catch (err: any) {
      const msg =
        err?.name === 'InvalidStateError'
          ? 'Esta passkey já está registrada neste dispositivo.'
          : err?.response?.data?.message ?? err?.message ?? 'Erro ao registrar passkey';
      setState((s) => ({ ...s, loading: false, error: msg }));
      return false;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await api.delete(`/webauthn/credentials/${id}`);
      await refresh();
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.response?.data?.message ?? 'Erro ao remover passkey',
      }));
    }
  }, [refresh]);

  return { ...state, register, remove, refresh };
}

/**
 * Hook standalone para tela de login: chama begin (com identifier opcional),
 * obtém a credencial do autenticador e finaliza via verify.
 * Retorna {user, accessToken, refreshToken} no sucesso.
 */
export async function loginWithPasskey(identifier?: string) {
  if (!browserSupportsWebAuthn()) {
    throw new Error('Seu navegador não suporta passkeys.');
  }
  const begin = await api.post('/webauthn/auth/begin', { identifier });
  const options = begin.data.data.options;
  const assertion = await startAuthentication({ optionsJSON: options });
  const verify = await api.post('/webauthn/auth/verify', assertion);
  return verify.data.data as {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
}
