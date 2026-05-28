import { useState } from "react";
import { AlertTriangle, Phone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import toast from "react-hot-toast";

export default function PanicButtonPage() {
  const { selectedCondominiumId } = useAuthStore();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePanico = async () => {
    if (!confirm("Confirmar ALERTA DE PÂNICO?\nA administração e os moradores da sua unidade serão notificados imediatamente.")) return;
    setLoading(true);
    try {
      await api.post("/panic", { condominiumId: selectedCondominiumId });
      setSent(true);
      toast.success("Alerta enviado! A equipe foi notificada.");
    } catch {
      toast.error("Erro ao enviar alerta. Ligue para a administração.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCondominiumId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Selecione um condomínio para usar o botão de pânico.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
      {!sent ? (
        <>
          <div className="text-center mb-10">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold text-gray-900">ALERTA DE PÂNICO</h1>
            <p className="text-gray-500 mt-2">
              Pressione o botão abaixo para notificar a administração e os moradores da sua unidade imediatamente
            </p>
          </div>

          <button
            onClick={handlePanico}
            disabled={loading}
            className="w-48 h-48 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 active:scale-95 transition-all disabled:opacity-80 border-8 border-red-300"
          >
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-white mx-auto mb-1" />
              <span className="text-white font-black text-xl">PÂNICO</span>
            </div>
          </button>

          <p className="text-xs text-gray-400 mt-8 text-center max-w-sm">
            Use apenas em situações de emergência real. O uso indevido pode resultar em advertência.
          </p>

          <button
            onClick={() => navigate(-1)}
            className="mt-6 flex items-center gap-1 text-gray-500 text-sm hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </>
      ) : (
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Alerta enviado!</h2>
          <p className="text-gray-500 mt-2">Aguarde. A equipe e os moradores da sua unidade foram notificados.</p>

          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs mx-auto">
            <a
              href="tel:190"
              className="bg-red-600 text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              Ligar 190 (Polícia)
            </a>
            <a
              href="tel:192"
              className="bg-red-700 text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-2 hover:bg-red-800 transition-colors"
            >
              <Phone className="w-5 h-5" />
              Ligar 192 (SAMU)
            </a>
            <button
              onClick={() => navigate("/")}
              className="mt-3 text-gray-500 text-sm underline hover:text-gray-700"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
