import { useNavigate } from "react-router-dom";
import {
  Building2,
  Shield,
  Users,
  DollarSign,
  Bell,
  CalendarDays,
  Wrench,
  Package,
  ChevronRight,
  CheckCircle2,
  Star,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Portaria Inteligente",
    desc: "Controle total de visitantes, encomendas e veículos com registro digital e notificações em tempo real.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: DollarSign,
    title: "Financeiro Completo",
    desc: "Gerencie cobranças, faturas e fluxo de caixa do condomínio com relatórios detalhados.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Users,
    title: "Gestão de Moradores",
    desc: "Cadastro completo de moradores, unidades, dependentes e pets em um único lugar.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: CalendarDays,
    title: "Áreas Comuns",
    desc: "Sistema de reservas online para salão de festas, churrasqueira, academia e muito mais.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Wrench,
    title: "Manutenção",
    desc: "Abertura e acompanhamento de chamados de manutenção com histórico completo.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: Bell,
    title: "Comunicação",
    desc: "Avisos, ocorrências e achados & perdidos para manter toda a comunidade informada.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Package,
    title: "Estoque e Documentos",
    desc: "Controle de estoque de materiais e repositório digital de documentos do condomínio.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Building2,
    title: "Multi-condomínio",
    desc: "Administre vários condomínios em um único painel com visibilidade total por unidade.",
    color: "bg-cyan-50 text-cyan-600",
  },
];

const testimonials = [
  {
    name: "Roberto Alves",
    role: "Síndico — Edifício Aurora",
    text: "Reduzimos em 80% o tempo gasto com planilhas. O controle financeiro ficou completamente transparente para os moradores.",
    stars: 5,
  },
  {
    name: "Carla Mendes",
    role: "Administradora — Residencial Sol Nascente",
    text: "A portaria ficou muito mais organizada. Nenhuma encomenda se perde mais e os moradores são avisados na hora.",
    stars: 5,
  },
  {
    name: "Paulo Henrique",
    role: "Síndico — Condomínio Parque Verde",
    text: "A facilidade para reservar áreas comuns pelo celular é incrível. Os moradores adoraram a autonomia.",
    stars: 5,
  },
];



export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">CondoSync</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a
              href="#features"
              className="hover:text-blue-600 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#testimonials"
              className="hover:text-blue-600 transition-colors"
            >
              Depoimentos
            </a>
          </nav>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            Entrar na plataforma
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        {/* decoração */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Plataforma SaaS para gestão condominial
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Gestão de condomínio{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              simples e inteligente
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            O CondoSync centraliza portaria, financeiro, comunicação e muito
            mais. Síndicos e moradores na mesma plataforma, em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-blue-900/50 hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              Acessar a plataforma
              <ChevronRight className="w-5 h-5" />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 text-slate-300 hover:text-white font-medium px-6 py-4 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all"
            >
              Ver funcionalidades
            </a>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm">
            {[
              "14 dias grátis",
              "Sem cartão de crédito",
              "Configuração em minutos",
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── NUMBERS ─────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "+500", label: "Condomínios ativos" },
            { value: "+50k", label: "Moradores cadastrados" },
            { value: "99.9%", label: "Disponibilidade" },
            { value: "4.9/5", label: "Satisfação dos clientes" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-extrabold text-blue-600 mb-1">
                {s.value}
              </p>
              <p className="text-slate-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Funcionalidades
            </p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Tudo que seu condomínio precisa
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Uma plataforma completa para substituir planilhas, grupos de
              WhatsApp e processos manuais.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">
              Depoimentos
            </p>
            <h2 className="text-4xl font-extrabold text-slate-900">
              Síndicos que confiam no CondoSync
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">
                  "{t.text}"
                </p>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-slate-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-4">
            Pronto para modernizar seu condomínio?
          </h2>
          <p className="text-slate-300 text-lg mb-10">
            Junte-se a centenas de condomínios que já simplificaram sua gestão
            com o CondoSync.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-blue-900/50 hover:-translate-y-0.5"
          >
            Acessar a plataforma
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="py-10 px-6 bg-slate-950 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1 rounded-md">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">CondoSync</span>
            <span className="ml-2">
              © {new Date().getFullYear()} Todos os direitos reservados.
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-white transition-colors">
              Funcionalidades
            </a>
            <button
              onClick={() => navigate("/login")}
              className="hover:text-white transition-colors"
            >
              Entrar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
