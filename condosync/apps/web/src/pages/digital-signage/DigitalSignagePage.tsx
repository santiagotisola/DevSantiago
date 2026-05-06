import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { Monitor, Plus, Trash2, Edit2, ExternalLink, Copy, QrCode, Tv } from "lucide-react";

interface Screen {
  id: string;
  name: string;
  location: string;
  token: string;
  isActive: boolean;
  slideDuration: number;
  primaryColor: string;
  _count?: { slides: number };
}

interface Slide {
  id: string;
  type: string;
  title?: string;
  content?: string;
  order: number;
  duration?: number;
  isActive: boolean;
}

const SLIDE_TYPES = [
  { value: "TEXT", label: "Texto Personalizado" },
  { value: "IMAGE", label: "Imagem" },
  { value: "ANNOUNCEMENT", label: "Comunicados Automáticos" },
  { value: "BIRTHDAY", label: "Aniversariantes do Dia" },
  { value: "CLOCK", label: "Relógio / Data" },
  { value: "MARKETPLACE", label: "Ofertas Marketplace" },
];

export default function DigitalSignagePage() {
  const { selectedCondominiumId } = useAuthStore();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScreenForm, setShowScreenForm] = useState(false);
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [screenForm, setScreenForm] = useState({
    name: "",
    location: "",
    slideDuration: 8,
    primaryColor: "#1e40af",
  });

  const [slideForm, setSlideForm] = useState({
    type: "TEXT",
    title: "",
    content: "",
    duration: 8,
  });

  useEffect(() => {
    if (selectedCondominiumId) loadScreens();
  }, [selectedCondominiumId]);

  useEffect(() => {
    if (selectedScreen) loadSlides(selectedScreen.id);
  }, [selectedScreen]);

  async function loadScreens() {
    setLoading(true);
    try {
      const res = await api.get(`/digital-signage/screens/${selectedCondominiumId}`);
      setScreens(res.data.data.screens);
    } finally {
      setLoading(false);
    }
  }

  async function loadSlides(screenId: string) {
    const res = await api.get(`/digital-signage/screens/${screenId}/slides`);
    setSlides(res.data.data.slides);
  }

  async function createScreen() {
    await api.post("/digital-signage/screens", {
      ...screenForm,
      condominiumId: selectedCondominiumId,
    });
    setShowScreenForm(false);
    setScreenForm({ name: "", location: "", slideDuration: 8, primaryColor: "#1e40af" });
    loadScreens();
  }

  async function deleteScreen(id: string) {
    if (!confirm("Remover esta tela?")) return;
    await api.delete(`/digital-signage/screens/${id}`);
    setSelectedScreen(null);
    loadScreens();
  }

  async function addSlide() {
    if (!selectedScreen) return;
    await api.post(`/digital-signage/screens/${selectedScreen.id}/slides`, slideForm);
    setShowSlideForm(false);
    setSlideForm({ type: "TEXT", title: "", content: "", duration: 8 });
    loadSlides(selectedScreen.id);
  }

  async function deleteSlide(slideId: string) {
    await api.delete(`/digital-signage/slides/${slideId}`);
    loadSlides(selectedScreen!.id);
  }

  async function toggleSlide(slide: Slide) {
    await api.patch(`/digital-signage/slides/${slide.id}`, { isActive: !slide.isActive });
    loadSlides(selectedScreen!.id);
  }

  function copyDisplayUrl(token: string) {
    const url = `${window.location.origin}/display/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function openDisplay(token: string) {
    window.open(`/display/${token}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tv className="h-6 w-6 text-blue-600" />
            Digital Signage — TV Elevador
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie monitores no elevador, hall e áreas comuns
          </p>
        </div>
        <button
          onClick={() => setShowScreenForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Tela
        </button>
      </div>

      {/* Formulário nova tela */}
      {showScreenForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Cadastrar Nova Tela</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da tela</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Elevador Torre A"
                value={screenForm.name}
                onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Elevador social - Torre A"
                value={screenForm.location}
                onChange={(e) => setScreenForm({ ...screenForm, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração por slide (seg)</label>
              <input
                type="number"
                min={3}
                max={60}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={screenForm.slideDuration}
                onChange={(e) => setScreenForm({ ...screenForm, slideDuration: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor primária</label>
              <input
                type="color"
                className="w-full h-10 border rounded-lg px-1 py-1 cursor-pointer"
                value={screenForm.primaryColor}
                onChange={(e) => setScreenForm({ ...screenForm, primaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createScreen}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Salvar
            </button>
            <button
              onClick={() => setShowScreenForm(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Lista de telas */}
        <div className="col-span-4 space-y-3">
          {screens.length === 0 && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Monitor className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhuma tela cadastrada</p>
            </div>
          )}
          {screens.map((screen) => (
            <div
              key={screen.id}
              onClick={() => setSelectedScreen(screen)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                selectedScreen?.id === screen.id
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: screen.primaryColor }}
                    />
                    <span className="font-medium text-gray-900 text-sm">{screen.name}</span>
                    {screen.isActive && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{screen.location}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {screen._count?.slides ?? 0} slides · {screen.slideDuration}s/slide
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteScreen(screen.id); }}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {/* Ações rápidas */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); copyDisplayUrl(screen.token); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Copy className="h-3 w-3" />
                  {copied === screen.token ? "Copiado!" : "Copiar URL"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDisplay(screen.token); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir TV
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Slides da tela selecionada */}
        <div className="col-span-8">
          {!selectedScreen ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center">
                <Monitor className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Selecione uma tela para gerenciar os slides</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedScreen.name}</h3>
                  <p className="text-xs text-gray-500">{selectedScreen.location}</p>
                </div>
                <button
                  onClick={() => setShowSlideForm(true)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Novo Slide
                </button>
              </div>

              {showSlideForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Adicionar Slide</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={slideForm.type}
                        onChange={(e) => setSlideForm({ ...slideForm, type: e.target.value })}
                      >
                        {SLIDE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Duração (seg)</label>
                      <input
                        type="number"
                        min={3}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={slideForm.duration}
                        onChange={(e) => setSlideForm({ ...slideForm, duration: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={slideForm.title}
                        onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Conteúdo / Mensagem</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={slideForm.content}
                        onChange={(e) => setSlideForm({ ...slideForm, content: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={addSlide} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                      Adicionar
                    </button>
                    <button onClick={() => setShowSlideForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {slides.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Nenhum slide cadastrado. Adicione slides para esta tela.
                </p>
              ) : (
                <div className="space-y-2">
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        slide.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-400 w-5">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            {SLIDE_TYPES.find((t) => t.value === slide.type)?.label ?? slide.type}
                          </span>
                          {slide.title && (
                            <span className="text-sm font-medium text-gray-800">{slide.title}</span>
                          )}
                        </div>
                        {slide.content && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{slide.content}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{slide.duration ?? selectedScreen.slideDuration}s</span>
                      <button
                        onClick={() => toggleSlide(slide)}
                        className={`text-xs px-2 py-1 rounded ${
                          slide.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {slide.isActive ? "Ativo" : "Inativo"}
                      </button>
                      <button onClick={() => deleteSlide(slide.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview URL */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-medium">URL da tela (cole no navegador da TV)</p>
                  <p className="text-xs text-blue-600 truncate">
                    {window.location.origin}/display/{selectedScreen.token}
                  </p>
                </div>
                <button
                  onClick={() => copyDisplayUrl(selectedScreen.token)}
                  className="text-xs bg-white border px-3 py-1 rounded hover:bg-gray-100 flex-shrink-0"
                >
                  {copied === selectedScreen.token ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
