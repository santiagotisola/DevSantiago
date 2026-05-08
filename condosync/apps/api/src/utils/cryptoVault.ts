/**
 * Envelope encryption helper para campos sensíveis no DB.
 *
 * Algoritmo: AES-256-GCM com IV aleatório por chamada (96 bits) e
 * authentication tag (128 bits) embutidos no ciphertext final.
 *
 * Formato de saída (base64):
 *   v1.<base64(iv)>.<base64(tag)>.<base64(ciphertext)>
 *
 * O prefixo de versão permite rotacionar chave/algoritmo no futuro
 * (v2.* com chave nova) mantendo compatibilidade de leitura.
 *
 * Chave-mestre vem de APP_ENCRYPTION_KEY (32 bytes em base64). Pode
 * ser gerada com: `openssl rand -base64 32`. APP_ENCRYPTION_KEY_PREVIOUS
 * é opcional e usado apenas para decrypt (suporta rotação online).
 */
import crypto from "node:crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION = "v1";

let cachedCurrentKey: Buffer | null = null;
let cachedPreviousKey: Buffer | null = null;

function loadKey(value: string | undefined, label: string): Buffer | null {
  if (!value) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(value, "base64");
  } catch {
    throw new Error(`${label} inválido — não é base64 válido`);
  }
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `${label} deve ter ${KEY_LENGTH} bytes após decode base64 (recebido ${buf.length}). ` +
        `Gere com: openssl rand -base64 32`,
    );
  }
  return buf;
}

function getCurrentKey(): Buffer {
  if (cachedCurrentKey) return cachedCurrentKey;
  const key = loadKey(env.APP_ENCRYPTION_KEY, "APP_ENCRYPTION_KEY");
  if (!key) {
    throw new Error(
      "APP_ENCRYPTION_KEY ausente — campos sensíveis não podem ser cifrados/decifrados.",
    );
  }
  cachedCurrentKey = key;
  return key;
}

function getPreviousKey(): Buffer | null {
  if (cachedPreviousKey) return cachedPreviousKey;
  cachedPreviousKey = loadKey(
    env.APP_ENCRYPTION_KEY_PREVIOUS,
    "APP_ENCRYPTION_KEY_PREVIOUS",
  );
  return cachedPreviousKey;
}

/**
 * Cifra uma string em texto-plano. Retorna formato versionado
 * `v1.<iv>.<tag>.<ciphertext>` (todos base64).
 */
export function encrypt(plain: string): string {
  const key = getCurrentKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/**
 * Decifra um valor produzido por `encrypt`. Tenta primeiro com a
 * chave atual; se falhar a verificação do auth tag (rotação),
 * tenta com a chave anterior.
 */
export function decrypt(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error(`Formato de cifrado desconhecido: ${parts[0] ?? "?"}`);
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("IV ou tag com tamanho inválido");
  }

  const tryDecrypt = (key: Buffer) => {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      "utf8",
    );
  };

  try {
    return tryDecrypt(getCurrentKey());
  } catch (err) {
    const previous = getPreviousKey();
    if (previous) {
      try {
        return tryDecrypt(previous);
      } catch {
        // fall through with original error
      }
    }
    throw err;
  }
}

/**
 * Detecta se um valor está em formato cifrado (vs plaintext legado
 * durante o período de migração).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${VERSION}.`) && value.split(".").length === 4;
}

/**
 * Cifra um objeto JSON serializável.
 */
export function encryptJson<T>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decrypt(payload)) as T;
}

// Para testes — limpa cache de chaves quando env muda.
export function _resetKeyCache() {
  cachedCurrentKey = null;
  cachedPreviousKey = null;
}
