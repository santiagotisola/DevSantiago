import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { redis } from "../../config/redis";
import { env } from "../../config/env";

const router = Router();
router.use(authenticate);
router.use(authorize("SUPER_ADMIN"));

// GET /admin/system-status — status de todos os serviços (SUPER_ADMIN only)
router.get("/system-status", async (_req: Request, res: Response) => {
  const startedAt = Date.now();

  // Banco de dados
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "error";
  }

  // Redis
  let redisStatus: "ok" | "error" = "ok";
  let redisLatencyMs = 0;
  try {
    const t0 = Date.now();
    await redis.ping();
    redisLatencyMs = Date.now() - t0;
  } catch {
    redisStatus = "error";
  }

  // Memória (MB)
  const mem = process.memoryUsage();

  // Contadores gerais
  const [condominiumCount, userCount, unitCount] = await Promise.all([
    prisma.condominium.count().catch(() => -1),
    prisma.user.count().catch(() => -1),
    prisma.unit.count().catch(() => -1),
  ]);

  const responseMs = Date.now() - startedAt;

  res.json({
    success: true,
    data: {
      status: dbStatus === "ok" && redisStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      responseMs,
      version: process.env.npm_package_version ?? "1.0.0",
      environment: env.NODE_ENV,
      node: process.version,
      uptime: {
        seconds: Math.floor(process.uptime()),
        human: formatUptime(process.uptime()),
      },
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      },
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        redis: { status: redisStatus, latencyMs: redisLatencyMs },
      },
      stats: {
        condominiums: condominiumCount,
        users: userCount,
        units: unitCount,
      },
      config: {
        corsOrigins: env.CORS_ORIGINS,
        frontendUrl: env.FRONTEND_URL,
        uploadPath: env.UPLOAD_PATH,
        aiProvider: env.GROQ_API_KEY ? "groq" : env.OPENAI_API_KEY ? "openai" : "none",
        emailProvider: env.RESEND_API_KEY ? "resend" : "smtp",
        whatsappEnabled: Boolean(process.env.MONGODB_URI),
      },
    },
  });
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default router;
