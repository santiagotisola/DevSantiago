import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Server,
  Database,
  Zap,
  Cpu,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Activity,
  Package,
  Users,
  Building2,
  Mail,
  MessageSquare,
  Bot,
  HardDrive,
  Globe,
} from "lucide-react";

interface SystemStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  responseMs: number;
  version: string;
  environment: string;
  node: string;
  uptime: { seconds: number; human: string };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
  };
  services: {
    database: { status: "ok" | "error"; latencyMs: number };
    redis: { status: "ok" | "error"; latencyMs: number };
  };
  stats: { condominiums: number; users: number; units: number };
  config: {
    corsOrigins: string;
    frontendUrl: string;
    uploadPath: string;
    aiProvider: "groq" | "openai" | "none";
    emailProvider: "resend" | "smtp";
    whatsappEnabled: boolean;
  };
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  name,
  status,
  latencyMs,
  detail,
}: {
  icon: React.ElementType;
  name: string;
  status: "ok" | "error";
  latencyMs?: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`p-1.5 rounded-lg ${
            status === "ok" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
          }`}
        >
          <Icon size={14} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{name}</p>
          {detail && <p className="text-xs text-gray-400">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {latencyMs !== undefined && status === "ok" && (
          <span className="text-xs text-gray-400">{latencyMs}ms</span>
        )}
        <StatusBadge ok={status === "ok"} label={status === "ok" ? "Online" : "Offline"} />
      </div>
    </div>
  );
}

export default function DeployDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } =
    useQuery<{ success: boolean; data: SystemStatus }>({
      queryKey: ["admin-system-status"],
      queryFn: () => api.get("/admin/system-status").then((r) => r.data),
      refetchInterval: 30_000,
      staleTime: 25_000,
    });

  const status = data?.data;

  const memPercent = status
    ? Math.round((status.memory.heapUsedMb / status.memory.heapTotalMb) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server size={22} className="text-blue-600" />
            Deploy &amp; Sistema
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Status em tempo real da infraestrutura do CondoSync
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-gray-400">
              Atualizado às{" "}
              {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}
            </span>
          )}
          <button
            onClick={() => refetch()}
            aria-label="Atualizar status"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-gray-700"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400">
          <Activity size={32} className="mx-auto mb-3 animate-pulse" />
          <p>Carregando status do sistema...</p>
        </div>
      )}
      {isError && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-sm text-center">
          <XCircle size={20} className="mx-auto mb-2" />
          Não foi possível carregar o status. Verifique se a API está rodando.
        </div>
      )}

      {status && (
        <>
          {/* Status Geral */}
          <div
            className={`rounded-xl p-4 flex items-center gap-3 border ${
              status.status === "healthy"
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            {status.status === "healthy" ? (
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            ) : (
              <Activity size={20} className="text-yellow-600 shrink-0" />
            )}
            <div>
              <p
                className={`font-semibold ${
                  status.status === "healthy"
                    ? "text-green-800"
                    : "text-yellow-800"
                }`}
              >
                {status.status === "healthy"
                  ? "Todos os serviços operacionais"
                  : "Sistema com degradação"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                v{status.version} &bull; {status.environment} &bull; Node{" "}
                {status.node} &bull; Resposta: {status.responseMs}ms
              </p>
            </div>
          </div>

          {/* Métricas principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={Clock}
              label="Uptime"
              value={status.uptime.human}
              sub="desde o último restart"
              color="green"
            />
            <MetricCard
              icon={Cpu}
              label="Heap Usada"
              value={`${status.memory.heapUsedMb} MB`}
              sub={`de ${status.memory.heapTotalMb} MB (${memPercent}%)`}
              color={memPercent > 80 ? "red" : memPercent > 60 ? "orange" : "blue"}
            />
            <MetricCard
              icon={HardDrive}
              label="RSS"
              value={`${status.memory.rssMb} MB`}
              sub="memória total do processo"
              color="purple"
            />
            <MetricCard
              icon={Activity}
              label="Latência API"
              value={`${status.responseMs}ms`}
              sub="tempo de resposta"
              color="orange"
            />
          </div>

          {/* Serviços + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Serviços */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                Serviços
              </h2>
              <ServiceRow
                icon={Database}
                name="PostgreSQL"
                status={status.services.database.status}
                latencyMs={status.services.database.latencyMs}
                detail="Banco de dados principal"
              />
              <ServiceRow
                icon={Zap}
                name="Redis"
                status={status.services.redis.status}
                latencyMs={status.services.redis.latencyMs}
                detail="Cache e filas (BullMQ)"
              />
              <ServiceRow
                icon={Bot}
                name={`IA — ${status.config.aiProvider === "none" ? "Desabilitada" : status.config.aiProvider}`}
                status={status.config.aiProvider !== "none" ? "ok" : "error"}
                detail={
                  status.config.aiProvider === "groq"
                    ? "Groq llama-3.3-70b (gratuito)"
                    : status.config.aiProvider === "openai"
                    ? "OpenAI gpt-4o-mini"
                    : "Nenhuma chave configurada"
                }
              />
              <ServiceRow
                icon={Mail}
                name={`E-mail — ${status.config.emailProvider}`}
                status="ok"
                detail={
                  status.config.emailProvider === "resend"
                    ? "Resend API (transacional)"
                    : "SMTP / Mailpit (dev)"
                }
              />
              <ServiceRow
                icon={MessageSquare}
                name="WhatsApp (Baileys)"
                status={status.config.whatsappEnabled ? "ok" : "error"}
                detail={
                  status.config.whatsappEnabled
                    ? "MongoDB conectado"
                    : "MONGODB_URI não configurado"
                }
              />
            </div>

            {/* Estatísticas */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Package size={14} className="text-blue-500" />
                  Estatísticas do Banco
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Building2 size={13} /> Condomínios
                    </span>
                    <span className="font-semibold text-gray-900">
                      {status.stats.condominiums >= 0
                        ? status.stats.condominiums
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Users size={13} /> Usuários
                    </span>
                    <span className="font-semibold text-gray-900">
                      {status.stats.users >= 0 ? status.stats.users : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Building2 size={13} /> Unidades
                    </span>
                    <span className="font-semibold text-gray-900">
                      {status.stats.units >= 0 ? status.stats.units : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-indigo-500" />
                  Configuração
                </h2>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Frontend URL</span>
                    <span className="font-mono text-gray-700 truncate max-w-[180px]">
                      {status.config.frontendUrl}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">CORS Origins</span>
                    <span className="font-mono text-gray-700 truncate max-w-[180px]">
                      {status.config.corsOrigins}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Upload Path</span>
                    <span className="font-mono text-gray-700">
                      {status.config.uploadPath}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de memória */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Cpu size={14} className="text-blue-500" />
                Memória do Processo
              </h2>
              <span className="text-xs text-gray-400">
                {status.memory.heapUsedMb} / {status.memory.heapTotalMb} MB heap
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <progress
                value={memPercent}
                max={100}
                aria-label={`Uso de memória heap: ${memPercent}%`}
                className={`block w-full h-full rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all ${
                  memPercent > 80
                    ? "[&::-webkit-progress-value]:bg-red-500"
                    : memPercent > 60
                    ? "[&::-webkit-progress-value]:bg-orange-400"
                    : "[&::-webkit-progress-value]:bg-green-500"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Heap usada: {status.memory.heapUsedMb} MB</span>
              <span>RSS: {status.memory.rssMb} MB</span>
              <span>External: {status.memory.externalMb} MB</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
