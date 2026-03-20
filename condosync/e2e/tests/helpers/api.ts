import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost/api/v1';

export interface AuthSession {
  accessToken: string;
  userId: string;
  role: string;
  condominiumId: string | null;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[e2e] Missing required environment variable: ${name}`);
  }
  return value;
}

export function isJwtLikelyValid(token: string, minTtlSec = 120): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;

    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
      exp?: number;
    };

    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 - Date.now() > minTtlSec * 1000;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(body)}`);

  const { user, accessToken } = body.data;
  return {
    accessToken,
    userId: user.id,
    role: user.role,
    condominiumId: user.condominiumUsers?.[0]?.condominiumId ?? null,
  };
}

export function readTokens(): {
  superAdmin: AuthSession;
  doorman: AuthSession;
  resident1: AuthSession;
  resident2: AuthSession;
} {
  const filePath = path.resolve(__dirname, '.auth-tokens.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function req(
  method: string,
  endpointPath: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${endpointPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export const CREDS = {
  get superAdmin() {
    return {
      email: requiredEnv('E2E_SUPERADMIN_EMAIL'),
      password: requiredEnv('E2E_SUPERADMIN_PASSWORD'),
    };
  },
  get doorman() {
    return {
      email: requiredEnv('E2E_DOORMAN_EMAIL'),
      password: requiredEnv('E2E_DOORMAN_PASSWORD'),
    };
  },
  get resident1() {
    return {
      email: requiredEnv('E2E_RESIDENT1_EMAIL'),
      password: requiredEnv('E2E_RESIDENT1_PASSWORD'),
    };
  },
  get resident2() {
    return {
      email: requiredEnv('E2E_RESIDENT2_EMAIL'),
      password: requiredEnv('E2E_RESIDENT2_PASSWORD'),
    };
  },
} as const;

export const CONDO_ID = '905f645e-275a-40eb-9166-13f360a2e58e';
