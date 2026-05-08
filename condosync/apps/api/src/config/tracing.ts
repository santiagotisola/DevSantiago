/**
 * OpenTelemetry tracing — auto-instrumentação para Express + http +
 * ioredis + bullmq + @prisma/instrumentation (manual abaixo se
 * disponível na versão).
 *
 * IMPORTANTE: este módulo deve ser importado em PRIMEIRO LUGAR no
 * processo (antes de qualquer outro `import` que use módulos
 * instrumentados). Caller faz:
 *
 *   // dist/server.js (entry)
 *   require('./config/tracing'); // hoisted import
 *   require('./server');         // rest of app
 *
 * Em ts-node-dev, o `--require` flag é o equivalente:
 *   ts-node-dev -r ./src/config/tracing.ts ...
 *
 * Backend exporter é configurado via env:
 *   OTEL_EXPORTER_OTLP_ENDPOINT (default: nenhum — desabilita)
 *   OTEL_SERVICE_NAME (default: condosync-api)
 *   OTEL_TRACES_SAMPLER (default: parentbased_traceidratio)
 *   OTEL_TRACES_SAMPLER_ARG (default: 0.1 = 10%)
 *
 * Sem OTEL_EXPORTER_OTLP_ENDPOINT, SDK não inicializa — zero
 * overhead. Liga em staging/prod via Railway env.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const serviceName = process.env.OTEL_SERVICE_NAME ?? "condosync-api";
const serviceVersion = process.env.npm_package_version ?? "1.0.0";

let sdk: NodeSDK | null = null;

if (endpoint) {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
        ? Object.fromEntries(
            process.env.OTEL_EXPORTER_OTLP_HEADERS.split(",").map((s) => {
              const [k, v] = s.split("=");
              return [k.trim(), v?.trim() ?? ""];
            }),
          )
        : undefined,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduz ruído: skip fs (filesystem) — instrumentação spam.
        "@opentelemetry/instrumentation-fs": { enabled: false },
        // Express + http + ioredis + pg/prisma + bullmq (se
        // disponíveis no auto-instrumentations) ficam ativos.
      }),
    ],
  });

  try {
    sdk.start();
    // Logger pode não estar disponível ainda (este arquivo é
    // hoisted antes do logger.ts). console.log uma vez no boot.
    console.log(
      `🔎 OpenTelemetry inicializado — exportando para ${endpoint} (service=${serviceName})`,
    );
  } catch (err) {
    console.error("❌ Falha inicializando OpenTelemetry:", err);
  }

  // Graceful shutdown — flush spans em curso antes do processo morrer.
  const shutdown = () => {
    if (sdk) {
      sdk
        .shutdown()
        .then(() => console.log("OpenTelemetry SDK encerrado"))
        .catch((err) => console.error("Erro encerrando OTEL:", err));
    }
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export {};
