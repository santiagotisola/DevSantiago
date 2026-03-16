import { Link } from 'react-router-dom';
import {
  Shield,
  DollarSign,
  Users,
  CalendarCheck,
  Wrench,
  Bell,
  Package,
  LayoutGrid,
  ArrowRight,
  CheckCircle2,
  Star,
  Building2,
  ChevronDown,
} from 'lucide-react';

// ─── Data ──────────────────────────────────────────────────────────────────

const features = [
  {
    Icon: Shield,
    title: 'Portaria Inteligente',
    desc: 'Controle total de visitantes, encomendas e veículos com registro digital e notificações em tempo real.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    Icon: DollarSign,
    title: 'Financeiro Completo',
    desc: 'Gerencie cobranças, faturas e fluxo de caixa do condomínio com relatórios detalhados.',
    color: 'bg-green-50 text-green-600',
  },
  {
    Icon: Users,
    title: 'Gestão de Moradores',
    desc: 'Cadastro completo de moradores, unidades, dependentes e pets em um único lugar.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    Icon: CalendarCheck,
    title: 'Áreas Comuns',
    desc: 'Sistema de reservas online para salão de festas, churrasqueira, academia e muito mais.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    Icon: Wrench,
    title: 'Manutenção',
    desc: 'Abertura e acompanhamento de chamados de manutenção com histórico completo.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    Icon: Bell,
    title: 'Comunicação',
    desc: 'Avisos, ocorrências e achados & perdidos para manter toda a comunidade informada.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    Icon: Package,
    title: 'Estoque e Documentos',
    desc: 'Controle de estoque de materiais e repositório digital de documentos do condomínio.',
    color: 'bg-slate-50 text-slate-600',
  },
  {
    Icon: LayoutGrid,
    title: 'Multi-condomínio',
    desc: 'Administre vários condomínios em um único painel com visibilidade total por unidade.',
    color: 'bg-teal-50 text-teal-600',
  },
];

const testimonials = [
  {
    quote: 'Reduzimos em 80% o tempo gasto com planilhas. O controle financeiro ficou completamente transparente para os moradores.',
    name: 'Roberto Alves',
    role: 'Síndico — Edifício Aurora',
  },
  {
    quote: 'A portaria ficou muito mais organizada. Nenhuma encomenda se perde mais e os moradores são avisados na hora.',
    name: 'Carla Mendes',
    role: 'Administradora — Residencial Sol Nascente',
  },
  {
    quote: 'A facilidade para reservar áreas comuns pelo celular é incrível. Os moradores adoraram a autonomia.',
    name: 'Paulo Henrique',
    role: 'Síndico — Condomínio Parque Verde',
  },
];

const plans = [
  {
    name: 'Starter',
    desc: 'Ideal para condomínios pequenos',
    price: 'R$ 149',
    period: '/mês',
    highlight: false,
    items: ['Até 50 unidades', 'Portaria digital', 'Financeiro básico', 'Suporte por e-mail'],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    desc: 'Para condomínios em crescimento',
    price: 'R$ 299',
    period: '/mês',
    highlight: true,
    items: ['Até 200 unidades', 'Tudo do Starter', 'Áreas comuns', 'Assembleias digitais', 'Suporte prioritário'],
    cta: 'Começar grátis',
  },
  {
    name: 'Enterprise',
    desc: 'Para grandes empreendimentos',
    price: 'Sob consulta',
    period: '',
    highlight: false,
    items: ['Unidades ilimitadas', 'Tudo do Pro', 'Multi-condomínio', 'API personalizada', 'Gerente dedicado'],
    cta: 'Falar com vendas',
  },
];

const stats = [
  { value: '+500', label: 'Condomínios ativos' },
  { value: '+50k', label: 'Moradores cadastrados' },
  { value: '99.9%', label: 'Disponibilidade' },
  { value: '4.9/5', label: 'Satisfação dos clientes' },
];

// ─── Components ───────────────────────────────────────────────────────────

function Stars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary-600">
            <Building2 size={24} />
            CondoSync
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <button onClick={() => scrollTo('features')} className="hover:text-primary-600 transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollTo('testimonials')} className="hover:text-primary-600 transition-colors">
              Depoimentos
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-primary-600 transition-colors">
              Planos
            </button>
          </nav>
          <Link
            to="/login"
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Entrar na plataforma
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden">
        {/* background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur">
            Plataforma SaaS para gestão condominial
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 max-w-4xl mx-auto">
            Gestão de condomínio simples e inteligente
          </h1>
          <p className="text-primary-200 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            O CondoSync centraliza portaria, financeiro, comunicação e muito mais. Síndicos e moradores na mesma plataforma, em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login"
              className="flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors shadow-lg text-base"
            >
              Acessar a plataforma
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => scrollTo('features')}
              className="flex items-center gap-2 border border-white/40 text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-base"
            >
              Ver funcionalidades
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-200 mb-16">
            {['14 dias grátis', 'Sem cartão de crédito', 'Configuração em minutos'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-green-400" />
                {t}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-5">
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-primary-200 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600">Funcionalidades</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2">Tudo que seu condomínio precisa</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Uma plataforma completa para substituir planilhas, grupos de WhatsApp e processos manuais.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2">
              Síndicos que confiam no CondoSync
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map(({ quote, name, role }) => (
              <div key={name} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <Stars />
                <p className="text-gray-700 mt-4 leading-relaxed italic">"{quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600">Planos</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2">Preço justo para todo tamanho</h2>
            <p className="text-gray-500 mt-3">Comece grátis por 14 dias. Sem cartão de crédito.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map(({ name, desc, price, period, highlight, items, cta }) => (
              <div
                key={name}
                className={[
                  'rounded-2xl p-8 border relative',
                  highlight
                    ? 'bg-primary-600 text-white border-primary-500 shadow-xl shadow-primary-200 scale-105'
                    : 'bg-white text-gray-900 border-gray-200 shadow-sm',
                ].join(' ')}
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">
                    Mais popular
                  </span>
                )}
                <h3 className={['font-bold text-xl mb-1', highlight ? 'text-white' : 'text-gray-900'].join(' ')}>
                  {name}
                </h3>
                <p className={['text-sm mb-6', highlight ? 'text-primary-200' : 'text-gray-500'].join(' ')}>{desc}</p>
                <div className="mb-8">
                  <span className={['text-4xl font-extrabold', highlight ? 'text-white' : 'text-gray-900'].join(' ')}>
                    {price}
                  </span>
                  {period && <span className={highlight ? 'text-primary-200' : 'text-gray-500'}>{period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        size={16}
                        className={highlight ? 'text-green-300' : 'text-green-500'}
                      />
                      <span className={highlight ? 'text-primary-100' : 'text-gray-600'}>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={[
                    'block text-center font-semibold px-6 py-3 rounded-xl transition-colors text-sm',
                    highlight
                      ? 'bg-white text-primary-700 hover:bg-primary-50'
                      : 'bg-primary-600 text-white hover:bg-primary-700',
                  ].join(' ')}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Pronto para modernizar seu condomínio?
          </h2>
          <p className="text-primary-200 mb-10 text-lg">
            Junte-se a centenas de condomínios que já simplificaram sua gestão com o CondoSync.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-10 py-4 rounded-xl hover:bg-primary-50 transition-colors text-base shadow-lg"
          >
            Acessar a plataforma
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Building2 size={18} />
            CondoSync
          </div>
          <p>© 2026 Todos os direitos reservados.</p>
          <nav className="flex gap-6">
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">
              Planos
            </button>
            <Link to="/login" className="hover:text-white transition-colors">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
