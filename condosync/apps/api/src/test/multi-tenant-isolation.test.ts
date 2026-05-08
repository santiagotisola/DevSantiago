/**
 * Suite de SMOKE de isolamento multi-tenant via mocks.
 *
 * Esta versão usa o prismaMock e verifica unitariamente que os
 * helpers de tenant scope funcionam — ela NÃO sobe um app
 * supertest com DB real (isso requer um banco de teste pronto e
 * fica como WS5-P2).
 *
 * Cobre os helpers que matam IDORs típicos:
 *   - assertActorBelongsToCondominium em residents.routes
 *   - authorizeCondominium em middleware/auth.ts
 *
 * Conforme o repository layer (WS5-P2) for plugado, esta suite
 * deve crescer com testes integration que disparam HTTP real
 * contra um Postgres dedicado.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request } from "express";
import { prismaMock } from "./setup";
import {
  authorizeCondominium,
} from "../middleware/auth";
import {
  ForbiddenError,
  BadRequestError,
} from "../middleware/errorHandler";

const buildReq = (overrides: Partial<Request> = {}): Request => {
  const req = {
    params: {},
    body: {},
    query: {},
    user: undefined,
    ...overrides,
  };
  return req as unknown as Request;
};

const noopRes = {} as never;
const next = vi.fn();

describe("authorizeCondominium — fail-closed e tenant scope", () => {
  beforeEach(() => {
    next.mockReset();
  });

  it("400 quando condominiumId ausente em params/body/query", async () => {
    const req = buildReq({
      user: { userId: "u-1", role: "RESIDENT" } as never,
    });
    await expect(
      authorizeCondominium(req, noopRes, next),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("403 quando usuário não é membership do condomínio", async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    const req = buildReq({
      user: { userId: "attacker", role: "CONDOMINIUM_ADMIN" } as never,
      params: { condominiumId: "condo-vitima" },
    });

    await expect(
      authorizeCondominium(req, noopRes, next),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("SUPER_ADMIN tem passe livre sem consultar condominiumUser", async () => {
    const req = buildReq({
      user: { userId: "su", role: "SUPER_ADMIN" } as never,
      params: { condominiumId: "qualquer" },
    });

    await authorizeCondominium(req, noopRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
  });

  it("usuário com membership ativa passa e tem role aplicada do membership", async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      id: "cu-1",
      userId: "u-1",
      condominiumId: "condo-1",
      role: "SYNDIC",
      isActive: true,
    } as never);

    const req = buildReq({
      user: { userId: "u-1", role: "RESIDENT" } as never,
      params: { condominiumId: "condo-1" },
    });

    await authorizeCondominium(req, noopRes, next);
    expect(next).toHaveBeenCalledOnce();
    // O middleware sobrescreve req.user.role com o role do membership
    expect((req.user as { role: string }).role).toBe("SYNDIC");
  });

  it("aceita condominiumId vindo de body se ausente em params", async () => {
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      id: "cu-1",
      role: "RESIDENT",
    } as never);

    const req = buildReq({
      user: { userId: "u-1", role: "RESIDENT" } as never,
      body: { condominiumId: "condo-2" },
    });

    await authorizeCondominium(req, noopRes, next);
    expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u-1",
        condominiumId: "condo-2",
        isActive: true,
      },
    });
  });
});
