/**
 * Testa as primitivas de leader lock isoladas. Não requer Redis real
 * — mocka ioredis e verifica os comandos atômicos que enviamos.
 *
 * Cenário crítico coberto: a renovação não pode usar SET NX (perde
 * leadership porque a chave existe). Deve usar Lua atômico com GET
 * + comparação + EXPIRE.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock do ioredis ANTES de importar redis.ts
const mockSet = vi.fn();
const mockEval = vi.fn();
vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      set: mockSet,
      eval: mockEval,
      on: vi.fn(),
    })),
  };
});

let tryAcquireLeaderLock: typeof import("../config/redis").tryAcquireLeaderLock;
let renewLeaderLock: typeof import("../config/redis").renewLeaderLock;
let releaseLeaderLock: typeof import("../config/redis").releaseLeaderLock;

beforeAll(async () => {
  ({
    tryAcquireLeaderLock,
    renewLeaderLock,
    releaseLeaderLock,
  } = await import("../config/redis"));
});

describe("Leader lock — eleição", () => {
  beforeEach(() => {
    mockSet.mockReset();
    mockEval.mockReset();
  });

  it("retorna fingerprint quando SET NX EX retorna OK", async () => {
    mockSet.mockResolvedValue("OK");
    const fp = await tryAcquireLeaderLock("schedulers", 240);
    expect(fp).toBeTruthy();
    expect(mockSet).toHaveBeenCalledWith(
      "leader:schedulers",
      expect.stringContaining(":"),
      "EX",
      240,
      "NX",
    );
  });

  it("retorna null quando outro nó já detém a lock", async () => {
    mockSet.mockResolvedValue(null);
    const fp = await tryAcquireLeaderLock("schedulers", 240);
    expect(fp).toBeNull();
  });

  it("fingerprints distintos em chamadas consecutivas (PID + ts + random)", async () => {
    mockSet.mockResolvedValue("OK");
    const fp1 = await tryAcquireLeaderLock("schedulers");
    const fp2 = await tryAcquireLeaderLock("schedulers");
    expect(fp1).not.toEqual(fp2);
  });
});

describe("Leader lock — renovação", () => {
  beforeEach(() => {
    mockEval.mockReset();
  });

  it("usa Lua atômico com GET + comparação (NÃO usa SET NX)", async () => {
    mockEval.mockResolvedValue(1);
    await renewLeaderLock("schedulers", "fp-1", 240);
    expect(mockEval).toHaveBeenCalledOnce();
    const [script, numKeys, key, fp, ttl] = mockEval.mock.calls[0];
    expect(script).toMatch(/redis\.call\("GET"/);
    expect(script).toMatch(/redis\.call\("EXPIRE"/);
    expect(numKeys).toBe(1);
    expect(key).toBe("leader:schedulers");
    expect(fp).toBe("fp-1");
    expect(ttl).toBe("240");
  });

  it("retorna true quando script retorna 1 (renovado)", async () => {
    mockEval.mockResolvedValue(1);
    expect(await renewLeaderLock("schedulers", "fp-1")).toBe(true);
  });

  it("retorna false quando script retorna 0 (lock tomada)", async () => {
    // Lua retorna 0 quando GET != ARGV[1] — outro nó assumiu.
    mockEval.mockResolvedValue(0);
    expect(await renewLeaderLock("schedulers", "fp-1")).toBe(false);
  });
});

describe("Leader lock — release", () => {
  beforeEach(() => {
    mockEval.mockReset();
  });

  it("usa Lua atômico para DEL apenas se for o dono", async () => {
    mockEval.mockResolvedValue(1);
    expect(await releaseLeaderLock("schedulers", "fp-1")).toBe(true);
    const [script] = mockEval.mock.calls[0];
    expect(script).toMatch(/redis\.call\("DEL"/);
  });

  it("retorna false quando lock pertence a outro", async () => {
    mockEval.mockResolvedValue(0);
    expect(await releaseLeaderLock("schedulers", "fp-1")).toBe(false);
  });
});
