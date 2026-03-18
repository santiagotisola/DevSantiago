/**
 * Helper de chamadas de API para os testes E2E do CondoSync.
 * Todas as requisições passam pelo nginx (http://localhost/api/v1/...) — mesma
 * rota que o browser usa — garantindo que o teste cobre o caminho real de produção.
 */

import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost/api/v1';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
  condominiumId: string | null;
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login falhou (${res.status}): ${JSON.stringify(body)}`);
  const { user, accessToken, refreshToken } = body.data;
  return {
    accessToken,
    refreshToken,
    userId: user.id,
    role: user.role,
    condominiumId: user.condominiumUsers?.[0]?.condominiumId ?? null,
  };
}

/**
 * Lê os tokens persistidos pelo globalSetup.
 * Nunca faz chamadas de login — use isso nos beforeAll dos specs.
 */
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

// ─── Requisição autenticada ────────────────────────────────────────────────
export async function req(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
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

// ─── Credenciais dos usuários seed ────────────────────────────────────────
export const CREDS = {
  superAdmin:  { email: 'admin@condosync.com.br',    password: 'Admin@2026' },
  doorman:     { email: 'porteiro@parqueverde.com.br', password: 'Porteiro@2026' },
  resident1:   { email: 'morador1@parqueverde.com.br', password: 'Morador@2026' },
  resident2:   { email: 'morador2@parqueverde.com.br', password: 'Morador@2026' },
} as const;

export const CONDO_ID = '905f645e-275a-40eb-9166-13f360a2e58e'; // seed: Residencial Veredas do Bosque
