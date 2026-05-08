/**
 * Métricas Prometheus expostas em GET /metrics.
 *
 * Endpoint deve ser acessível apenas pela rede interna (k8s
 * ServiceMonitor / Prometheus scraper). Em produção, adicionar
 * proteção via header (X-Metrics-Token) ou whitelist de IPs no
 * proxy upstream.
 *
 * Métricas-chave:
 *   - http_request_duration_seconds (histograma por method/route/status)
 *   - http_requests_total (counter)
 *   - bullmq_jobs_total (queue+result)
 *   - bullmq_queue_depth (gauge por queue+state)
 *   - bullmq_leader_renewal_total (result)
 *   - idor_guard_decisions_total (allow/deny por module)
 *   - webhook_asaas_events_total
 *   - prisma_query_duration_seconds (com label operation)
 *   - default Node.js metrics (event loop lag, mem, etc.)
 */
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

// ─── HTTP ──────────────────────────────────────────────────────
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Latência de requisições HTTP",
  labelNames: ["method", "route", "status"],
  // Buckets adequados para API CRUD: 5ms a 5s.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total de requisições HTTP",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

// ─── BullMQ ────────────────────────────────────────────────────
export const bullJobsTotal = new Counter({
  name: "bullmq_jobs_total",
  help: "Total de jobs BullMQ por resultado",
  labelNames: ["queue", "result"],
  registers: [registry],
});

export const bullQueueDepth = new Gauge({
  name: "bullmq_queue_depth",
  help: "Profundidade da fila BullMQ por estado",
  labelNames: ["queue", "state"],
  registers: [registry],
});

export const bullJobDuration = new Histogram({
  name: "bullmq_job_duration_seconds",
  help: "Duração de jobs BullMQ",
  labelNames: ["queue"],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
  registers: [registry],
});

export const bullLeaderRenewals = new Counter({
  name: "bullmq_leader_renewal_total",
  help: "Tentativas de renovação do leader lock",
  labelNames: ["result"], // ok | lost
  registers: [registry],
});

// ─── Segurança ─────────────────────────────────────────────────
export const idorGuardDecisions = new Counter({
  name: "idor_guard_decisions_total",
  help: "Decisões do middleware requireResourceMembership",
  labelNames: ["module", "result"], // allow | deny
  registers: [registry],
});

export const webhookAsaasEvents = new Counter({
  name: "webhook_asaas_events_total",
  help: "Eventos recebidos do webhook Asaas",
  labelNames: ["event", "result"], // ok | duplicate | invalid | error
  registers: [registry],
});

// ─── Middleware HTTP ───────────────────────────────────────────
/**
 * Mede duração de cada request. Aplica como middleware GLOBAL
 * em server.ts, ANTES dos route handlers para que `req.route`
 * esteja disponível em res.on('finish').
 */
export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    // req.route só existe se algum router fizer match. Para 404,
    // usamos label "unknown".
    const route = req.route?.path ?? req.baseUrl ?? "unknown";
    const method = req.method;
    const status = String(res.statusCode);
    const elapsedSec =
      Number(process.hrtime.bigint() - start) / 1_000_000_000;
    httpRequestDuration.labels(method, route, status).observe(elapsedSec);
    httpRequestsTotal.labels(method, route, status).inc();
  });
  next();
}
