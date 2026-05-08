/**
 * Testa o cryptoVault — AES-256-GCM com IV aleatório por chamada,
 * formato versionado, suporte a rotação de chave.
 */
import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";

// Setar chaves antes de carregar o módulo (env é validado no boot).
const KEY_A = crypto.randomBytes(32).toString("base64");
const KEY_B = crypto.randomBytes(32).toString("base64");
process.env.APP_ENCRYPTION_KEY = KEY_A;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vault = require("../utils/cryptoVault");

describe("cryptoVault", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = KEY_A;
    delete process.env.APP_ENCRYPTION_KEY_PREVIOUS;
    vault._resetKeyCache();
  });

  it("roundtrip encrypt/decrypt preserva o valor", () => {
    const ciphered = vault.encrypt("$asaas-prod-key-1234567890");
    expect(ciphered).toMatch(/^v1\./);
    expect(vault.decrypt(ciphered)).toBe("$asaas-prod-key-1234567890");
  });

  it("dois encrypts do mesmo valor produzem ciphertexts distintos (IV aleatório)", () => {
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

  it("falha em decrypt com chave errada (auth tag inválido)", () => {
    const ciphered = vault.encrypt("segredo");
    process.env.APP_ENCRYPTION_KEY = KEY_B;
    vault._resetKeyCache();
    expect(() => vault.decrypt(ciphered)).toThrow();
  });

  it("rotação online: KEY_PREVIOUS permite ler dados cifrados com a chave antiga", () => {
    const cipheredWithA = vault.encrypt("histórico");
    // Rotação: nova chave atual = B, anterior = A.
    process.env.APP_ENCRYPTION_KEY = KEY_B;
    process.env.APP_ENCRYPTION_KEY_PREVIOUS = KEY_A;
    vault._resetKeyCache();
    expect(vault.decrypt(cipheredWithA)).toBe("histórico");
    // Encrypt agora usa a nova chave; decrypt continua funcionando.
    const cipheredWithB = vault.encrypt("novo");
    expect(vault.decrypt(cipheredWithB)).toBe("novo");
  });

  it("falha em formato desconhecido (proteção contra downgrade)", () => {
    expect(() => vault.decrypt("v2.iv.tag.ct")).toThrow(/Formato/);
    expect(() => vault.decrypt("nada")).toThrow();
  });
});
