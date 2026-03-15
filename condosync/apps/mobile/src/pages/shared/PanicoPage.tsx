import { useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function PanicoPage() {
  const { selectedCondominiumId } = useAuthStore();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePanico = async () => {
    if (!confirm('Confirmar ALERTA DE PÂNICO? A administração será notificada imediatamente.')) return;
    setLoading(true);
    try {
      await api.post('/panic', { condominiumId: selectedCondominiumId });
      setSent(true);
      toast.success('Alerta enviado! Ajuda a caminho.');
    } catch {
      toast.error('Erro ao enviar alerta. Ligue para a administração.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-8 safe-top safe-bottom">
      {!sent ? (
        <>
          <div className="text-center mb-10">
            <AlertTriangle size={64} className="text-white mx-auto mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold text-white">ALERTA DE PÂNICO</h1>
            <p className="text-red-200 mt-2 text-sm">
              Pressione o botão para notificar a administração imediatamente
            </p>
          </div>

          <button
            onClick={handlePanico}
            disabled={loading}
            className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-80 border-8 border-red-400"
          >
            <div className="text-center">
              <AlertTriangle size={48} className="text-red-600 mx-auto mb-1" />
              <span className="text-red-700 font-black text-xl">PÂNICO</span>
            </div>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="mt-10 text-red-200 text-sm underline"
          >
            Cancelar e voltar
          </button>
        </>
      ) : (
        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <AlertTriangle size={48} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-white">Alerta enviado!</h2>
          <p className="text-red-200 mt-2 text-sm">Aguarde. A equipe foi notificada.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="tel:190"
              className="bg-white text-red-700 rounded-xl py-3 px-8 font-bold flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              Ligar 190 (Polícia)
            </a>
            <a
              href="tel:192"
              className="bg-red-800 text-white rounded-xl py-3 px-8 font-bold flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              Ligar 192 (SAMU)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
