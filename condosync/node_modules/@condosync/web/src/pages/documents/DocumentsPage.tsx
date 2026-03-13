import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  Filter,
} from "lucide-react";
import { formatDate } from "../../lib/utils";

const CATEGORIES = [
  "ata",
  "convenção",
  "regulamento",
  "boleto",
  "comunicado",
  "outro",
] as const;

const categoryLabels: Record<string, { label: string; className: string }> = {
  ata: { label: "Ata", className: "bg-purple-100 text-purple-700" },
  convenção: { label: "Convenção", className: "bg-blue-100 text-blue-700" },
  regulamento: {
    label: "Regulamento",
    className: "bg-indigo-100 text-indigo-700",
  },
  boleto: { label: "Boleto", className: "bg-yellow-100 text-yellow-700" },
  comunicado: { label: "Comunicado", className: "bg-green-100 text-green-700" },
  outro: { label: "Outro", className: "bg-gray-100 text-gray-600" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
    user?.role || "",
  );

  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ata",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", selectedCondominiumId, categoryFilter],
    queryFn: async () => {
      const url = `/documents/${selectedCondominiumId}${categoryFilter ? `?category=${encodeURIComponent(categoryFilter)}` : ""}`;
      const res = await api.get(url);
      return res.data.data.documents as any[];
    },
    enabled: !!selectedCondominiumId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Nenhum arquivo selecionado");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      formData.append("category", form.category);
      return api.post(`/documents/${selectedCondominiumId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowModal(false);
      setForm({ title: "", description: "", category: "ata" });
      setFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/documents/${selectedCondominiumId}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleDownload = (doc: any) => {
    // Use axios to get the blob so the auth header is included
    api
      .get(`/documents/${selectedCondominiumId}/${doc.id}/download`, {
        responseType: "blob",
      })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Atas, regulamentos e arquivos do condomínio
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Enviar documento
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <button
          onClick={() => setCategoryFilter("")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!categoryFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Todos
        </button>
        {CATEGORIES.map((c) => {
          const ct = categoryLabels[c];
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? "" : c)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${categoryFilter === c ? "bg-blue-600 text-white" : `${ct.className} hover:opacity-80`}`}
            >
              {ct.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <FileText className="w-10 h-10" />
          <p>Nenhum documento encontrado</p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Enviar o primeiro documento
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc: any) => {
            const ct = categoryLabels[doc.category] || categoryLabels.outro;
            return (
              <div key={doc.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-medium text-sm">{doc.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.className}`}
                      >
                        {ct.label}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{doc.fileName}</span>
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (window.confirm("Remover este documento?"))
                            deleteMutation.mutate(doc.id);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Enviar Documento</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Ata de Assembleia — Março 2026"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoria *</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabels[c].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Arquivo *</label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Word, Excel, imagens — máx. 10 MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm({ title: "", description: "", category: "ata" });
                  setFile(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => uploadMutation.mutate()}
                disabled={!form.title || !file || uploadMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar"
                )}
              </button>
            </div>
            {uploadMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                {(uploadMutation.error as any)?.response?.data?.message ||
                  "Erro ao enviar arquivo."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
