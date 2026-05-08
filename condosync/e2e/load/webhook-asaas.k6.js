/**
 * Load test do webhook Asaas — valida outbox pattern em pico
 * realístico de pagamentos.
 *
 * Executa: k6 run --env BASE_URL=https://staging.condosync \
 *                --env TOKEN=<asaas-token> \
 *                e2e/load/webhook-asaas.k6.js
 *
 * Cenários:
 *   - rampUp: 0 → 100 RPS em 30s.
 *   - sustain: 100 RPS por 5min.
 *   - rampDown: 100 → 0 em 30s.
 *
 * Critérios de aceite (k6 thresholds):
 *   - p95 < 200ms (route apenas grava + enfileira)
 *   - error rate < 0.1%
 *   - Asaas-style replay (10% de duplicados): aceitos como
 *     idempotente (200) sem 5xx.
 *
 * IMPORTANTE: rodar contra STAGING. Em prod, threadlocks em
 * BullMQ Redis podem afetar workers em produção real.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { randomString } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3333";
const TOKEN = __ENV.TOKEN || "test-token-with-at-least-32-chars-aaaa";

const latency = new Trend("webhook_latency_ms", true);
const idempotent200 = new Rate("idempotent_200");
const errors = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 100 }, // ramp up
    { duration: "5m", target: 100 }, // sustain
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"],
    http_req_failed: ["rate<0.001"],
    errors: ["rate<0.001"],
  },
};

// Pool de paymentIds: 10% dos requests serão duplicados deliberadamente
// (replay) para validar que outbox aguenta sem 5xx.
const PAYMENT_POOL = Array.from({ length: 1000 }, (_, i) => `k6-pay-${i}`);

export default function () {
  // 10% de chance de reuso de paymentId (replay test)
  const useDup = Math.random() < 0.1;
  const paymentId = useDup
    ? PAYMENT_POOL[Math.floor(Math.random() * 100)] // pool pequeno = mais colisão
    : `k6-pay-${randomString(16)}`;
  const eventId = useDup
    ? `k6-evt-${paymentId}`
    : `k6-evt-${randomString(20)}`;

  const payload = JSON.stringify({
    id: eventId,
    event: "PAYMENT_RECEIVED",
    payment: {
      id: paymentId,
      value: 350,
      status: "RECEIVED",
      confirmedDate: new Date().toISOString().slice(0, 10),
    },
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/webhooks/asaas`, payload, {
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": TOKEN,
    },
    timeout: "10s",
  });
  latency.add(Date.now() - start);

  const isOk = check(res, {
    "status 200": (r) => r.status === 200,
  });

  if (!isOk) {
    errors.add(1);
    console.error(`Failure: status=${res.status} body=${res.body}`);
  } else {
    errors.add(0);
    if (useDup && res.status === 200) {
      idempotent200.add(1);
    }
  }

  sleep(0.05); // ~20 RPS por VU em fase sustain
}
