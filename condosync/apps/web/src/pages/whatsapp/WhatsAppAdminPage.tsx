import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Send,
  Users,
  FileText,
  Clock,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

type Tab = "connection" | "send" | "templates" | "history";

interface Template {
  id: string;
  name: string;
  content: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "visitante",
    name: "Visitante chegou",
    content: "Olá {{nome}}, seu visitante {{visitante}} chegou na portaria.",
  },
  {
    id: "encomenda",
    name: "Encomenda",
    content:
      "Olá {{nome}}, uma encomenda chegou para {{unidade}}. Retire na portaria.",
  },
  {
    id: "cobranca",
    name: "Cobrança",
    content:
      "Olá {{nome}}, sua mensalidade de R$ {{valor}} vence em {{data}}.",
  },
  {
    id: "assembleia",
    name: "Assembleia",
    content:
      "Olá {{nome}}, assembleia agendada para {{data}} às {{hora}}.",
  },
  {
    id: "manutencao",
    name: "Manutenção",
    content:
      "Olá {{nome}}, manutenção programada: {{descricao}} em {{data}}.",
  },
];

function getStoredTemplates(): Template[] {
  try {
    const stored = localStorage.getItem("whatsapp_templates");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem("whatsapp_templates", JSON.stringify(templates));
}

export default function WhatsAppAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("connection");

  const tabs = [
    { id: "connection" as Tab, label: "Conexão", icon: Wifi },
    { id: "send" as Tab, label: "Enviar Mensagem", icon: Send },
    { id: "templates" as Tab, label: "Templates", icon: FileText },
    { id: "history" as Tab, label: "Histórico", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-green-600" />
          WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Gerencie a conexão e envie mensagens via WhatsApp
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "connection" && <ConnectionTab />}
      {activeTab === "send" && <SendTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}

// ============== CONNECTION TAB ==============
function ConnectionTab() {
  const {
    data: statusData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const res = await api.get("/whatsapp/status");
      return res.data;
    },
    refetchInterval: 5000,
  });

  const { data: qrData, refetch: refetchQR } = useQuery({
    queryKey: ["whatsapp-qr"],
    queryFn: async () => {
      const res = await api.get("/whatsapp/qr");
      return res.data;
    },
    refetchInterval: statusData?.status === "aguardando_qr" ? 3000 : false,
    enabled: statusData?.status !== "conectado",
  });

  const iniciarMutation = useMutation({
    mutationFn: () => api.post("/whatsapp/iniciar"),
    onSuccess: () => {
      refetch();
      refetchQR();
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.post("/whatsapp/disconnect"),
    onSuccess: () => refetch(),
  });

  const status = statusData?.status || "desconectado";
  const isConnected = status === "conectado";
  const isWaitingQR = status === "aguardando_qr";

  return (
    <div className="bg-white rounded-xl border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Status da Conexão</h2>
        <button
          onClick={() => refetch()}
          className="text-slate-500 hover:text-slate-700"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                <Wifi className="w-5 h-5" />
                <span className="font-medium">Conectado</span>
                <span className="text-green-500">✅</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                <WifiOff className="w-5 h-5" />
                <span className="font-medium">
                  {isWaitingQR ? "Aguardando QR Code" : "Desconectado"}
                </span>
                <span className="text-red-500">❌</span>
              </div>
            )}
          </div>

          {/* QR Code Area */}
          {!isConnected && (
            <div className="space-y-4">
              {isWaitingQR && qrData?.qr ? (
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-600">
                    Escaneie o QR Code com seu WhatsApp:
                  </p>
                  <img
                    src={`data:image/png;base64,${qrData.qr}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 border rounded-lg"
                  />
                  <p className="text-xs text-slate-400">
                    O QR Code atualiza automaticamente
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-200 rounded-xl">
                  <WifiOff className="w-12 h-12 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    WhatsApp não está conectado. Clique em "Conectar" para
                    gerar o QR Code.
                  </p>
                  <button
                    onClick={() => iniciarMutation.mutate()}
                    disabled={iniciarMutation.isPending}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    {iniciarMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4" />
                    )}
                    Conectar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Disconnect Button */}
          {isConnected && (
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              Desconectar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============== SEND TAB ==============
function SendTab() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [broadcastGroup, setBroadcastGroup] = useState<
    "ALL" | "OVERDUE" | "UNIT"
  >("ALL");
  const [broadcastTemplate, setBroadcastTemplate] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const sendMutation = useMutation({
    mutationFn: (data: { para: string; mensagem: string }) =>
      api.post("/whatsapp/send", data),
    onSuccess: () => {
      setPhone("");
      setMessage("");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: { group: string; template: string }) =>
      api.post("/whatsapp/broadcast", data),
    onSuccess: () => {
      setShowConfirm(false);
      setBroadcastTemplate("");
    },
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 9)
      return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
  };

  const getCleanPhone = () => phone.replace(/\D/g, "");

  const groupLabels: Record<string, string> = {
    ALL: "Todos os moradores",
    OVERDUE: "Inadimplentes",
    UNIT: "Unidade específica",
  };

  return (
    <div className="space-y-6">
      {/* Individual Message */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Mensagem Individual</h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+55 11 99999-9999"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={19}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-slate-400">{message.length}/1000</p>
          </div>

          <button
            onClick={() =>
              sendMutation.mutate({
                para: getCleanPhone(),
                mensagem: message,
              })
            }
            disabled={
              sendMutation.isPending ||
              getCleanPhone().length < 10 ||
              !message.trim()
            }
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar
          </button>

          {sendMutation.isSuccess && (
            <p className="text-sm text-green-600">✅ Mensagem enviada!</p>
          )}
          {sendMutation.isError && (
            <p className="text-sm text-red-600">
              ❌ Erro ao enviar. Verifique se o WhatsApp está conectado.
            </p>
          )}
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Envio em Massa
        </h2>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Grupo de destinatários</label>
            <select
              value={broadcastGroup}
              onChange={(e) =>
                setBroadcastGroup(e.target.value as "ALL" | "OVERDUE" | "UNIT")
              }
              aria-label="Grupo de destinatários"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="ALL">Todos os moradores</option>
              <option value="OVERDUE">Inadimplentes</option>
              <option value="UNIT">Unidade específica</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Mensagem (use variáveis: {"{{nome}}"}, {"{{unidade}}"},{" "}
              {"{{valor}}"})
            </label>
            <textarea
              value={broadcastTemplate}
              onChange={(e) => setBroadcastTemplate(e.target.value)}
              placeholder="Olá {{nome}}, informamos que..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              maxLength={2000}
            />
          </div>

          {/* Preview */}
          {broadcastTemplate && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-800 mb-1">
                Preview:
              </p>
              <p className="text-sm text-green-700">
                {broadcastTemplate
                  .replace(/\{\{nome\}\}/g, "João Silva")
                  .replace(/\{\{unidade\}\}/g, "101A")
                  .replace(/\{\{valor\}\}/g, "850,00")}
              </p>
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!broadcastTemplate.trim()}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            Enviar para: {groupLabels[broadcastGroup]}
          </button>

          {broadcastMutation.isSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="font-medium text-green-800">
                ✅ Envio concluído!
              </p>
              <p className="text-green-700">
                Enviadas: {(broadcastMutation.data as any)?.data?.sent || 0} |
                Falhas: {(broadcastMutation.data as any)?.data?.failed || 0}
              </p>
            </div>
          )}
          {broadcastMutation.isError && (
            <p className="text-sm text-red-600">
              ❌ Erro no envio em massa. Verifique a conexão do WhatsApp.
            </p>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">Confirmar envio em massa</h3>
            <p className="text-sm text-slate-600">
              Você está prestes a enviar mensagens para:{" "}
              <strong>{groupLabels[broadcastGroup]}</strong>
            </p>
            <p className="text-xs text-slate-400">
              As mensagens serão enviadas com intervalo de 2s entre cada para
              evitar bloqueio.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  broadcastMutation.mutate({
                    group: broadcastGroup,
                    template: broadcastTemplate,
                  })
                }
                disabled={broadcastMutation.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== TEMPLATES TAB ==============
function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>(getStoredTemplates());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  const save = (updated: Template[]) => {
    setTemplates(updated);
    saveTemplates(updated);
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setEditContent(template.content);
  };

  const handleSaveEdit = (id: string) => {
    const updated = templates.map((t) =>
      t.id === id ? { ...t, content: editContent } : t
    );
    save(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    save(templates.filter((t) => t.id !== id));
  };

  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) return;
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newName,
      content: newContent,
    };
    save([...templates, newTemplate]);
    setShowNew(false);
    setNewName("");
    setNewContent("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Templates de Mensagem</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="grid gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{template.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-slate-400 hover:text-blue-600"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="text-slate-400 hover:text-red-600"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingId === template.id ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  placeholder="Conteúdo do template..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(template.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 border rounded text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                {template.content}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* New Template Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Novo Template</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nome</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Lembrete de reunião"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Conteúdo (variáveis: {"{{nome}}"}, {"{{unidade}}"},{" "}
                  {"{{valor}}"}, {"{{data}}"}, {"{{hora}}"})
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Olá {{nome}}, ..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newContent.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Criar Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== HISTORY TAB ==============
function HistoryTab() {
  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="text-lg font-semibold">Histórico de Mensagens</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium text-slate-600">Data</th>
              <th className="pb-2 font-medium text-slate-600">Destinatário</th>
              <th className="pb-2 font-medium text-slate-600">Mensagem</th>
              <th className="pb-2 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={4}
                className="text-center py-12 text-slate-400"
              >
                <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>Histórico disponível em breve</p>
                <p className="text-xs mt-1">
                  As mensagens enviadas aparecerão aqui
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
