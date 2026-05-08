/**
 * Testes do middleware requireResourceMembership — defesa em
 * profundidade contra IDOR cross-tenant em rotas com :id.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { prismaMock } from "./setup";
import { requireResourceMembership } from "../middleware/auth";
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from "../middleware/errorHandler";

const buildReq = (overrides: Partial<Request> = {}): Request => {
  return {
    params: {},
    body: {},
    query: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
};

const noopRes = {} as Response;
const next = vi.fn();

describe("requireResourceMembership", () => {
  beforeEach(() => {
    next.mockReset();
  });

  it("401 quando não autenticado", async () => {
    const mw = requireResourceMembership("ticket" as never);
    await expect(
      mw(buildReq({ params: { id: "t-1" } }), noopRes, next),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("400 quando :id ausente", async () => {
    const mw = requireResourceMembership("ticket" as never);
    await expect(
      mw(
        buildReq({
          user: { userId: "u-1", role: "RESIDENT" } as never,
        }),
        noopRes,
        next,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("404 quando recurso não existe (sem vazar existência)", async () => {
    (prismaMock as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket = {
      findUnique: vi.fn().mockResolvedValue(null),
    };
    const mw = requireResourceMembership("ticket" as never);
    await expect(
      mw(
        buildReq({
          user: { userId: "u-1", role: "RESIDENT" } as never,
          params: { id: "t-1" },
        }),
        noopRes,
        next,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("404 quando ator NÃO é membership do condomínio do recurso (não vaza existência)", async () => {
    (prismaMock as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket = {
      findUnique: vi.fn().mockResolvedValue({
        id: "t-1",
        condominiumId: "condo-vitima",
      }),
    };
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    const mw = requireResourceMembership("ticket" as never);
    await expect(
      mw(
        buildReq({
          user: { userId: "atacante", role: "SYNDIC" } as never,
          params: { id: "t-1" },
        }),
        noopRes,
        next,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("SUPER_ADMIN bypass — segue para o handler com req.resource set", async () => {
    (prismaMock as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket = {
      findUnique: vi.fn().mockResolvedValue({
        id: "t-1",
        condominiumId: "condo-x",
        title: "Bug",
      }),
    };

    const mw = requireResourceMembership("ticket" as never);
    const req = buildReq({
      user: { userId: "su", role: "SUPER_ADMIN" } as never,
      params: { id: "t-1" },
    });
    await mw(req, noopRes, next);

    expect(next).toHaveBeenCalledOnce();
    expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
    expect(req.resource).toMatchObject({ id: "t-1", title: "Bug" });
  });

  it("autoriza quando ator é membership do mesmo condomínio", async () => {
    (prismaMock as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket = {
      findUnique: vi.fn().mockResolvedValue({
        id: "t-1",
        condominiumId: "condo-1",
      }),
    };
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      id: "cu-1",
    } as never);

    const mw = requireResourceMembership("ticket" as never);
    const req = buildReq({
      user: { userId: "u-1", role: "SYNDIC" } as never,
      params: { id: "t-1" },
    });
    await mw(req, noopRes, next);

    expect(next).toHaveBeenCalledOnce();
    expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u-1",
        condominiumId: "condo-1",
        isActive: true,
      },
      select: { id: true },
    });
  });

  it("resolveCondominiumId customizado para campos aninhados", async () => {
    (prismaMock as unknown as { charge: { findUnique: ReturnType<typeof vi.fn> } }).charge = {
      findUnique: vi.fn().mockResolvedValue({
        id: "c-1",
        unit: { condominiumId: "condo-aninhado" },
      }),
    };
    prismaMock.condominiumUser.findFirst.mockResolvedValue({
      id: "cu-1",
    } as never);

    const mw = requireResourceMembership("charge" as never, {
      include: { unit: { select: { condominiumId: true } } },
      resolveCondominiumId: (r) =>
        (r.unit as { condominiumId: string }).condominiumId,
    });

    await mw(
      buildReq({
        user: { userId: "u-1", role: "SYNDIC" } as never,
        params: { id: "c-1" },
      }),
      noopRes,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(prismaMock.condominiumUser.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "u-1",
        condominiumId: "condo-aninhado",
        isActive: true,
      },
      select: { id: true },
    });
  });

  it("403 quando recurso não tem condominiumId resolvível (fail-closed)", async () => {
    (prismaMock as unknown as { ticket: { findUnique: ReturnType<typeof vi.fn> } }).ticket = {
      findUnique: vi.fn().mockResolvedValue({
        id: "t-1",
        condominiumId: null,
      }),
    };

    const mw = requireResourceMembership("ticket" as never);
    await expect(
      mw(
        buildReq({
          user: { userId: "u-1", role: "SYNDIC" } as never,
          params: { id: "t-1" },
        }),
        noopRes,
        next,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
