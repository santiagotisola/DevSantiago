import fs from 'fs';
import path from 'path';
import { AuthSession, CREDS, isJwtLikelyValid } from './api';

const BASE = 'http://localhost/api/v1';

type Sessions = {
  superAdmin: AuthSession;
  doorman: AuthSession;
  resident1: AuthSession;
  resident2: AuthSession;
};

async function loginUser(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email} (${res.status}): ${JSON.stringify(body)}`);
  }

  const { user, accessToken } = body.data;
  return {
    accessToken,
    userId: user.id,
    role: user.role,
    condominiumId: user.condominiumUsers?.[0]?.condominiumId ?? null,
  };
}

function readCachedTokens(filePath: string): Sessions | null {
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Sessions;
  } catch {
    return null;
  }
}

function areCachedTokensUsable(tokens: Sessions): boolean {
  return (
    isJwtLikelyValid(tokens.superAdmin.accessToken) &&
    isJwtLikelyValid(tokens.doorman.accessToken) &&
    isJwtLikelyValid(tokens.resident1.accessToken) &&
    isJwtLikelyValid(tokens.resident2.accessToken)
  );
}

export default async function globalSetup() {
  const outPath = path.resolve(__dirname, '.auth-tokens.json');

  const cached = readCachedTokens(outPath);
  if (cached && areCachedTokensUsable(cached)) {
    console.log('\n[globalSetup] Reusing cached access tokens.');
    return;
  }

  console.log('\n[globalSetup] Logging in seed users...');

  const [superAdmin, doorman, resident1, resident2] = await Promise.all([
    loginUser(CREDS.superAdmin.email, CREDS.superAdmin.password),
    loginUser(CREDS.doorman.email, CREDS.doorman.password),
    loginUser(CREDS.resident1.email, CREDS.resident1.password),
    loginUser(CREDS.resident2.email, CREDS.resident2.password),
  ]);

  const tokens: Sessions = { superAdmin, doorman, resident1, resident2 };
  fs.writeFileSync(outPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });

  console.log(`[globalSetup] Access tokens written to ${outPath}`);
}
