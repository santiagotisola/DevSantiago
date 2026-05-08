/**
 * Request context — propaga request-id via AsyncLocalStorage.
 *
 * Permite que QUALQUER código acessado durante o lifecycle de um
 * request (services, repos, workers acionados pelo request)
 * recupere o requestId sem precisar passar por parâmetro. Usado
 * por:
 *  - logger child (`logger.child({ requestId })` automático).
 *  - Sentry scope tag.
 *  - Header X-Request-Id na response (cliente correlaciona com
 *    suporte).
 *
 * Sem isto, em incidente real, achar "este Sentry event corresponde
 * a qual log do morgan?" é tentativa-e-erro com timestamp ± 1s.
 * Em concorrência alta, impossível.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";

interface RequestContext {
  requestId: string;
  userId?: string;
  condominiumId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Atualiza userId/condominiumId no contexto (chamado pelo authenticate). */
export function setRequestUser(userId?: string, condominiumId?: string) {
  const store = storage.getStore();
  if (store) {
    store.userId = userId;
    store.condominiumId = condominiumId;
  }
}

/**
 * Middleware express:
 *  1. Lê X-Request-Id do header (preserva trace id de proxies).
 *  2. Senão, gera UUID v4.
 *  3. Echo no header da response.
 *  4. Sentry tag para correlação com erros.
 *  5. AsyncLocalStorage.run para propagar pelo subsequente.
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = String(req.headers["x-request-id"] ?? "").trim();
  const requestId =
    incoming.length > 0 && incoming.length <= 128
      ? incoming
      : crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);

  // Sentry scope: attach tag para todos os erros deste request.
  // getCurrentScope() retorna a scope do hub atual.
  Sentry.getCurrentScope().setTag("request_id", requestId);

  storage.run({ requestId }, () => next());
}
