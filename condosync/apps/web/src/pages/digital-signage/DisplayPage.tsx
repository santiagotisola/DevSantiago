import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

interface SlideData {
  id: string;
  type: string;
  title?: string;
  content?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  duration?: number;
}

interface ScreenData {
  name: string;
  location: string;
  slideDuration: number;
  primaryColor: string;
  logoUrl?: string;
}

interface FeedData {
  screen: ScreenData;
  slides: SlideData[];
  announcements: { id: string; title: string; content: string; isPinned: boolean }[];
  birthdays: { name: string }[];
  offers: { title: string; discount?: string; partner: string; logoUrl?: string }[];
}

function ClockSlide({ primaryColor }: { primaryColor: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return (
    <div className="flex flex-col items-center justify-center h-full text-white" style={{ backgroundColor: primaryColor }}>
      <div className="text-8xl font-thin tracking-widest">
        {String(now.getHours()).padStart(2,"0")}:{String(now.getMinutes()).padStart(2,"0")}
        <span className="text-4xl opacity-60">:{String(now.getSeconds()).padStart(2,"0")}</span>
      </div>
      <div className="text-2xl mt-4 opacity-80">
        {days[now.getDay()]}, {now.getDate()} de {months[now.getMonth()]} de {now.getFullYear()}
      </div>
    </div>
  );
}

function BirthdaySlide({ birthdays, primaryColor }: { birthdays: { name: string }[]; primaryColor: string }) {
  if (birthdays.length === 0) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full text-white p-16" style={{ backgroundColor: "#7c3aed" }}>
      <div className="text-6xl mb-6">🎂</div>
      <h2 className="text-4xl font-bold mb-6">Aniversariantes de Hoje!</h2>
      <div className="space-y-3">
        {birthdays.map((b, i) => (
          <div key={i} className="text-3xl text-center bg-white/20 px-8 py-3 rounded-full">
            🎉 {b.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementSlide({ announcement }: { announcement: { title: string; content: string } }) {
  return (
    <div className="flex flex-col justify-center h-full bg-slate-900 text-white p-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-lg font-bold">
          📢 COMUNICADO
        </div>
      </div>
      <h2 className="text-4xl font-bold mb-6 leading-tight">{announcement.title}</h2>
      <p className="text-2xl opacity-80 leading-relaxed">{announcement.content}</p>
    </div>
  );
}

function OfferSlide({ offer }: { offer: { title: string; discount?: string; partner: string; logoUrl?: string } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-emerald-800 text-white p-16">
      <div className="text-lg opacity-70 mb-2 tracking-widest uppercase">Parceiro Exclusivo</div>
      <h2 className="text-5xl font-bold mb-4">{offer.partner}</h2>
      <p className="text-3xl opacity-90 mb-6">{offer.title}</p>
      {offer.discount && (
        <div className="bg-yellow-400 text-emerald-900 text-4xl font-black px-8 py-4 rounded-2xl">
          {offer.discount}
        </div>
      )}
    </div>
  );
}

function TextSlide({ slide, primaryColor }: { slide: SlideData; primaryColor: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-16 text-white"
      style={{
        backgroundColor: slide.backgroundColor ?? primaryColor,
        color: slide.textColor ?? "#ffffff",
      }}
    >
      {slide.title && <h2 className="text-5xl font-bold mb-6 text-center">{slide.title}</h2>}
      {slide.content && <p className="text-3xl text-center opacity-90 leading-relaxed">{slide.content}</p>}
    </div>
  );
}

function ImageSlide({ slide }: { slide: SlideData }) {
  return (
    <div className="h-full w-full relative">
      <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
      {slide.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-8">
          <h2 className="text-4xl font-bold">{slide.title}</h2>
          {slide.content && <p className="text-xl mt-2 opacity-80">{slide.content}</p>}
        </div>
      )}
    </div>
  );
}

export default function DisplayPage() {
  const { token } = useParams<{ token: string }>();
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await axios.get(`/api/v1/digital-signage/display/${token}`);
      setFeed(res.data.data);
    } catch {
      setError("Tela não encontrada ou desativada");
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
    // Recarrega feed a cada 5 minutos para pegar novos comunicados
    const refreshInterval = setInterval(fetchFeed, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchFeed]);

  // Monta lista de slides dinâmica
  const allSlides = useCallback((): Array<{ type: string; data: unknown; duration: number }> => {
    if (!feed) return [];
    const duration = feed.screen.slideDuration * 1000;
    const list: Array<{ type: string; data: unknown; duration: number }> = [];

    // Slide de relógio sempre primeiro
    list.push({ type: "clock", data: null, duration });

    // Slides cadastrados manualmente
    for (const s of feed.slides) {
      if (s.type === "ANNOUNCEMENT") {
        for (const ann of feed.announcements) {
          list.push({ type: "announcement", data: ann, duration: (s.duration ?? feed.screen.slideDuration) * 1000 });
        }
      } else if (s.type === "BIRTHDAY" && feed.birthdays.length > 0) {
        list.push({ type: "birthday", data: feed.birthdays, duration: (s.duration ?? feed.screen.slideDuration) * 1000 });
      } else if (s.type === "MARKETPLACE" && feed.offers.length > 0) {
        for (const offer of feed.offers) {
          list.push({ type: "offer", data: offer, duration: (s.duration ?? feed.screen.slideDuration) * 1000 });
        }
      } else if (s.type === "CLOCK") {
        list.push({ type: "clock", data: null, duration: (s.duration ?? feed.screen.slideDuration) * 1000 });
      } else {
        list.push({ type: s.type.toLowerCase(), data: s, duration: (s.duration ?? feed.screen.slideDuration) * 1000 });
      }
    }

    // Injeta aniversariantes automaticamente se não tiver slide do tipo
    if (!feed.slides.some((s) => s.type === "BIRTHDAY") && feed.birthdays.length > 0) {
      list.push({ type: "birthday", data: feed.birthdays, duration });
    }

    // Injeta comunicados automaticamente
    if (!feed.slides.some((s) => s.type === "ANNOUNCEMENT")) {
      for (const ann of feed.announcements) {
        list.push({ type: "announcement", data: ann, duration });
      }
    }

    return list;
  }, [feed]);

  useEffect(() => {
    if (!feed) return;
    const slides = allSlides();
    if (slides.length === 0) return;

    const current = slides[currentIdx % slides.length];
    const timer = setTimeout(() => {
      setCurrentIdx((idx) => (idx + 1) % slides.length);
    }, current.duration);

    return () => clearTimeout(timer);
  }, [currentIdx, feed, allSlides]);

  if (error) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-2xl opacity-60">{error}</p>
        </div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  const slides = allSlides();
  if (slides.length === 0) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center text-white"
        style={{ backgroundColor: feed.screen.primaryColor }}
      >
        <h1 className="text-5xl font-bold">{feed.screen.name}</h1>
        <p className="text-2xl opacity-60 mt-2">{feed.screen.location}</p>
      </div>
    );
  }

  const current = slides[currentIdx % slides.length];
  const primaryColor = feed.screen.primaryColor;

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Slide atual */}
      <div className="w-full h-full">
        {current.type === "clock" && <ClockSlide primaryColor={primaryColor} />}
        {current.type === "birthday" && (
          <BirthdaySlide birthdays={current.data as { name: string }[]} primaryColor={primaryColor} />
        )}
        {current.type === "announcement" && (
          <AnnouncementSlide announcement={current.data as { title: string; content: string }} />
        )}
        {current.type === "offer" && (
          <OfferSlide offer={current.data as { title: string; discount?: string; partner: string }} />
        )}
        {current.type === "text" && (
          <TextSlide slide={current.data as SlideData} primaryColor={primaryColor} />
        )}
        {current.type === "image" && <ImageSlide slide={current.data as SlideData} />}
      </div>

      {/* Barra inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3 text-white/70 text-sm"
        style={{ backgroundColor: `${primaryColor}cc` }}
      >
        <span className="font-medium">{feed.screen.name}</span>
        <span>{feed.screen.location}</span>
        <span>
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Indicadores de slide */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIdx % slides.length ? "w-6 bg-white" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
