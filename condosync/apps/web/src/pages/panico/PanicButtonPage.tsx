import { useState, useRef, useCallback, useEffect } from "react";
import { AlertTriangle, Phone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import toast from "react-hot-toast";

const HOLD_MS = 2500; // tempo de press-and-hold para evitar disparo acidental
const RING = 88; // raio do anel de progresso (SVG)
const CIRC = 2 * Math.PI * RING;

/**
 * Geolocalização best-effort: wrapper Promise (getCurrentPosition é
 * callback) + timeout de 3s. NUNCA rejeita — em erro/timeout/permissão
 * negada/sem suporte resolve null e o disparo segue sem coordenadas.
 * Requer secure context (prod é HTTPS; localhost também é secure).
 */
function getCoordsBestEffort(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  const geo = new Promise<{ latitude: number; longitude: number } | null>(
    (resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 },
      );
    },
  );
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
  return Promise.race([geo, timeout]);
}

export default function PanicButtonPage() {
  const { selectedCondominiumId } = useAuthStore();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  const holdStart = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const trigger = useCallback(async () => {
    if (loading || sent) return;
    setLoading(true);
    try {
      const coords = await getCoordsBestEffort();
      await api.post("/panic", {
        condominiumId: selectedCondominiumId,
        ...(coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : {}),
      });
      setSent(true);
      toast.success("Alerta enviado! A equipe foi notificada.");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(
          "Você já tem um alerta de pânico ativo. Aguarde o atendimento.",
        );
      } else {
        toast.error("Erro ao enviar alerta. Ligue para a administração.");
      }
    } finally {
      setLoading(false);
    }
  }, [loading, sent, selectedCondominiumId]);

  const stopHold = useCallback(() => {
    holdStart.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (!firedRef.current) setProgress(0);
  }, []);

  const tick = useCallback(() => {
    if (holdStart.current == null) return;
    const elapsed = Date.now() - holdStart.current;
    const p = Math.min(elapsed / HOLD_MS, 1);
    setProgress(p);
    if (p >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        holdStart.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        void trigger().finally(() => {
          firedRef.current = false;
          setProgress(0);
        });
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [trigger]);

  const startHold = useCallback(() => {
    if (loading || sent || holdStart.current != null || firedRef.current) return;
    holdStart.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [loading, sent, tick]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  if (!selectedCondominiumId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">
          Selecione um condomínio para usar o botão de pânico.
        </p>
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
              Mantenha o botão pressionado por 2,5s para acionar a administração
              e os moradores da sua unidade
            </p>
          </div>

          <div className="relative w-48 h-48 select-none">
            {/* Anel de progresso do press-and-hold */}
            <svg
              className="absolute inset-0 -rotate-90 pointer-events-none"
              width="192"
              height="192"
              viewBox="0 0 192 192"
              aria-hidden="true"
            >
              <circle
                cx="96"
                cy="96"
                r={RING}
                fill="none"
                stroke="#fecaca"
                strokeWidth="8"
              />
              <circle
                cx="96"
                cy="96"
                r={RING}
                fill="none"
                stroke="#dc2626"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
              />
            </svg>

            <button
              type="button"
              aria-label="Botão de pânico — mantenha pressionado por 2,5 segundos para acionar"
              disabled={loading}
              onPointerDown={startHold}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startHold();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  stopHold();
                }
              }}
              className="absolute inset-2 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 active:scale-95 transition-all disabled:opacity-80 touch-none"
            >
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-white mx-auto mb-1" />
                <span className="text-white font-black text-xl">
                  {loading ? "..." : "PÂNICO"}
                </span>
              </div>
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-8 text-center max-w-sm">
            Segure para acionar. Use apenas em situações de emergência real. O uso
            indevido pode resultar em advertência.
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
          <p className="text-gray-500 mt-2">
            Aguarde. A equipe e os moradores da sua unidade foram notificados.
          </p>

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
