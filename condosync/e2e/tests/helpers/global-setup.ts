/**
 * Playwright globalSetup — executa UMA VEZ antes de todos os testes.
 *
 * Faz login de todos os usuários seed e persiste os tokens em
 * .auth-tokens.json para que cada spec não precise logar novamente.
 * Isso evita estourar o authRateLimiter (10 req / 15 min por IP).
 */

import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost/api/v1';

async function loginUser(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login falhou para ${email} (${res.status}): ${JSON.stringify(body)}`);
  const { user, accessToken, refreshToken } = body.data;
  return {
    accessToken,
    refreshToken,
    userId: user.id,
    role: user.role,
    condominiumId: user.condominiumUsers?.[0]?.condominiumId ?? null,
  };
}

export default async function globalSetup() {
  const outPath = path.resolve(__dirname, '.auth-tokens.json');

  // Reutiliza tokens se existirem e tiverem menos de 50 min (token vive 1h)
  if (fs.existsSync(outPath)) {
    const age = Date.now() - fs.statSync(outPath).mtimeMs;
    if (age < 50 * 60 * 1000) {
      console.log('\n[globalSetup] Tokens em cache ainda válidos — pulando login.');
      return;
    }
  }

  console.log('\n[globalSetup] Fazendo login dos usuários seed...');

  const CREDS = {
    superAdmin: { email: 'admin@condosync.com.br',        password: 'Admin@2026' },
    doorman:    { email: 'porteiro@parqueverde.com.br',    password: 'Porteiro@2026' },
    resident1:  { email: 'morador1@parqueverde.com.br',    password: 'Morador@2026' },
    resident2:  { email: 'morador2@parqueverde.com.br',    password: 'Morador@2026' },
  };

  const [superAdmin, doorman, resident1, resident2] = await Promise.all([
    loginUser(CREDS.superAdmin.email, CREDS.superAdmin.password),
    loginUser(CREDS.doorman.email,    CREDS.doorman.password),
    loginUser(CREDS.resident1.email,  CREDS.resident1.password),
    loginUser(CREDS.resident2.email,  CREDS.resident2.password),
  ]);

  const tokens = { superAdmin, doorman, resident1, resident2 };
  fs.writeFileSync(outPath, JSON.stringify(tokens, null, 2));

  console.log(`[globalSetup] Tokens salvos em ${outPath}`);
}
