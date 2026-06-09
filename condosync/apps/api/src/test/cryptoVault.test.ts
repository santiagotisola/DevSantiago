/**
 * Testa o cryptoVault - AES-256-GCM com IV aleatorio por chamada,
 * formato versionado, suporte a rotacao de chave.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import { env } from "../config/env";

// Setar chaves antes de carregar o modulo (env e validado no boot).
const KEY_A = crypto.randomBytes(32).toString("base64");
const KEY_B = crypto.randomBytes(32).toString("base64");
process.env.APP_ENCRYPTION_KEY = KEY_A;

let vault: typeof import("../utils/cryptoVault");

describe("cryptoVault", () => {
  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY = KEY_A;
    delete process.env.APP_ENCRYPTION_KEY_PREVIOUS;
    (env as any).APP_ENCRYPTION_KEY = KEY_A;
    (env as any).APP_ENCRYPTION_KEY_PREVIOUS = undefined;
    vi.resetModules();
    vault = await import("../utils/cryptoVault");
    vault._resetKeyCache();
  });

  it("roundtrip encrypt/decrypt preserva o valor", () => {
    const ciphered = vault.encrypt("$asaas-prod-key-1234567890");
    expect(ciphered).toMatch(/^v1\./);
    expect(vault.decrypt(ciphered)).toBe("$asaas-prod-key-1234567890");
  });

  it("dois encrypts do mesmo valor produzem ciphertexts distintos (IV aleatorio)", () => {
    const c1 = vault.encrypt("mesma-coisa");
    const c2 = vault.encrypt("mesma-coisa");
    expect(c1).not.toEqual(c2);
    expect(vault.decrypt(c1)).toBe(vault.decrypt(c2));
  });

  it("isEncrypted detecta o prefixo versionado", () => {
    expect(vault.isEncrypted(vault.encrypt("x"))).toBe(true);
    expect(vault.isEncrypted("plaintext")).toBe(false);
    expect(vault.isEncrypted(null)).toBe(false);
    expect(vault.isEncrypted("")).toBe(false);
  });

  it("encryptJson/decryptJson preservam objetos", () => {
    const obj = { walletId: "abc-123", clientId: "xyz", flags: [1, 2, 3] };
    const ciphered = vault.encryptJson(obj);
    expect(vault.decryptJson(ciphered)).toEqual(obj);
  });

  it.skip("falha em decrypt com chave errada (auth tag invalido)", () => {
    const ciphered = vault.encrypt("segredo");
    process.env.APP_ENCRYPTION_KEY = KEY_B;
    process.env.APP_ENCRYPTION_KEY_PREVIOUS = KEY_B;
    (env as any).APP_ENCRYPTION_KEY = KEY_B;
    (env as any).APP_ENCRYPTION_KEY_PREVIOUS = KEY_B;
    vault._resetKeyCache();
    expect(() => vault.decrypt(ciphered)).toThrow();
  });

  it("rotacao online: KEY_PREVIOUS permite ler dados cifrados com a chave antiga", () => {
    const cipheredWithA = vault.encrypt("historico");
    process.env.APP_ENCRYPTION_KEY = KEY_B;
    process.env.APP_ENCRYPTION_KEY_PREVIOUS = KEY_A;
    (env as any).APP_ENCRYPTION_KEY = KEY_B;
    (env as any).APP_ENCRYPTION_KEY_PREVIOUS = KEY_A;
    vault._resetKeyCache();
    expect(vault.decrypt(cipheredWithA)).toBe("historico");
    const cipheredWithB = vault.encrypt("novo");
    expect(vault.decrypt(cipheredWithB)).toBe("novo");
  });

  it("falha em formato desconhecido (protecao contra downgrade)", () => {
    expect(() => vault.decrypt("v2.iv.tag.ct")).toThrow(/Formato/);
    expect(() => vault.decrypt("nada")).toThrow();
  });
});
