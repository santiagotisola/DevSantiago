import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
type AuthenticatorTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../middleware/errorHandler';
import type { JwtPayload } from '../../middleware/auth';

const log = logger.child({ module: 'webauthn' });

const CHALLENGE_TTL_SECONDS = 5 * 60;

function getRpConfig() {
  const rpID =
    env.WEBAUTHN_RP_ID ??
    (() => {
      try {
        return new URL(env.FRONTEND_URL).hostname;
      } catch {
        return 'localhost';
      }
    })();
  const origin = env.WEBAUTHN_ORIGIN ?? env.FRONTEND_URL.replace(/\/$/, '');
  return { rpID, rpName: env.WEBAUTHN_RP_NAME, origin };
}

function challengeKey(scope: 'register' | 'login', userId: string): string {
  return `webauthn:${scope}:${userId}`;
}

async function setChallenge(scope: 'register' | 'login', userId: string, challenge: string) {
  await redis.set(challengeKey(scope, userId), challenge, 'EX', CHALLENGE_TTL_SECONDS);
}
async function consumeChallenge(scope: 'register' | 'login', userId: string): Promise<string | null> {
  const key = challengeKey(scope, userId);
  const v = await redis.get(key);
  if (v) await redis.del(key);
  return v;
}

export const webauthnService = {
  /**
   * Gera opções para registrar uma nova credencial (passkey) para o usuário.
   * Persiste a challenge em Redis por TTL curto; uma challenge consumida não
   * pode ser reutilizada.
   */
  async generateRegistrationOptions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundError('Usuário', userId);

    const { rpID, rpName } = getRpConfig();

    const existingCreds = await prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: existingCreds.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransport[],
      })),
    });

    await setChallenge('register', userId, options.challenge);
    return options;
  },

  /**
   * Verifica a resposta do navegador e persiste a credencial.
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string,
  ) {
    const expectedChallenge = await consumeChallenge('register', userId);
    if (!expectedChallenge) {
      throw new BadRequestError('Challenge não encontrada ou expirada');
    }

    const { rpID, origin } = getRpConfig();
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestError('Verificação falhou');
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;

    await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceName: deviceName ?? credentialDeviceType,
      },
    });

    return { verified: true };
  },

  /**
   * Lista as credenciais registradas do usuário (para o painel de gestão).
   */
  async listByUser(userId: string) {
    return prisma.webAuthnCredential.findMany({
      where: { userId },
      select: {
        id: true,
        credentialId: true,
        deviceName: true,
        lastUsedAt: true,
        createdAt: true,
        transports: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteCredential(userId: string, credentialPk: string) {
    const deleted = await prisma.webAuthnCredential.deleteMany({
      where: { id: credentialPk, userId },
    });
    if (deleted.count === 0) throw new NotFoundError('Credencial', credentialPk);
  },

  /**
   * Gera opções de autenticação. Quando `identifier` é informado (email/CPF),
   * só inclui as credenciais daquele usuário (usable-credential discovery).
   * Sem identifier, gera uma challenge "usernameless" — útil para "Entrar
   * com passkey" sem pré-seleção.
   */
  async generateAuthenticationOptions(identifier?: string) {
    const { rpID } = getRpConfig();
    let userId: string | undefined;
    let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransport[] }> | undefined;

    if (identifier) {
      const where = identifier.includes('@')
        ? { email: identifier.trim().toLowerCase() }
        : { cpf: identifier.replace(/\D/g, '') };
      const user = await prisma.user.findUnique({
        where: where as any,
        select: { id: true },
      });
      // Resposta neutra: gera opções "vazias" para não revelar se o usuário existe.
      if (user) {
        userId = user.id;
        const creds = await prisma.webAuthnCredential.findMany({
          where: { userId: user.id },
          select: { credentialId: true, transports: true },
        });
        allowCredentials = creds.map((c) => ({
          id: c.credentialId,
          transports: c.transports as AuthenticatorTransport[],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Para usernameless guardamos a challenge num bucket "guest";
    // ao verificar buscamos a credencial pelo credentialId retornado.
    await setChallenge('login', userId ?? '_anon', options.challenge);
    return options;
  },

  async verifyAuthentication(response: AuthenticationResponseJSON) {
    const credential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: response.id },
      include: { user: { select: { id: true, role: true, name: true, isActive: true } } },
    });
    if (!credential) throw new UnauthorizedError('Credencial não reconhecida');
    if (!credential.user.isActive) throw new UnauthorizedError('Conta desativada');

    const challenge =
      (await consumeChallenge('login', credential.userId)) ??
      (await consumeChallenge('login', '_anon'));
    if (!challenge) {
      throw new BadRequestError('Challenge não encontrada ou expirada');
    }

    const { rpID, origin } = getRpConfig();
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransport[],
        },
      });
    } catch (err) {
      log.warn('Falha na verificação WebAuthn', {
        userId: credential.userId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new UnauthorizedError('Verificação falhou');
    }

    if (!verification.verified) {
      throw new UnauthorizedError('Verificação falhou');
    }

    // Atualiza counter e lastUsedAt
    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Gera tokens (espelha auth.service.login)
    const payload: JwtPayload = {
      userId: credential.user.id,
      role: credential.user.role,
      name: credential.user.name,
    };
    const accessOpts: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
    const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };
    const accessToken = jwt.sign({ ...payload }, env.JWT_SECRET as Secret, accessOpts);
    const refreshToken = jwt.sign({ ...payload }, env.JWT_REFRESH_SECRET as Secret, refreshOpts);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: credential.user.id, expiresAt },
    });

    await prisma.user.update({
      where: { id: credential.user.id },
      data: { lastLoginAt: new Date() },
    });

    // Carrega user completo p/ resposta (igual ao login normal)
    const fullUser = await prisma.user.findUniqueOrThrow({
      where: { id: credential.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        condominiumUsers: {
          where: { isActive: true },
          include: {
            condominium: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    });

    return { user: fullUser, accessToken, refreshToken };
  },
};
