import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutGrid,
  Banknote,
  Megaphone,
  BarChart3,
  Building2,
  ShieldCheck,
  LogOut,
  ChevronDown,
  X,
  DoorOpen,
  Settings,
  UserRound,
  Contact,
  Palette,
  Wrench,
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

interface NavChild {
  label: string;
  to: string;
  roles?: string[];
}
interface NavItem {
  label: string;
  to?: string;
  icon: React.ElementType;
  children?: NavChild[];
  roles?: string[];
}

const MANAGEMENT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];
const COUNCIL_COMMUNITY = ["RESIDENT", "COUNCIL_MEMBER", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];
const ALL_AUTH = ["RESIDENT", "DOORMAN", "COUNCIL_MEMBER", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN", "SERVICE_PROVIDER"];

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutGrid },

  {
    label: "Portaria",
    icon: ShieldCheck,
    roles: ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"],
    children: [
      { label: "Visitantes", to: "/portaria/visitantes" },
      { label: "Encomendas", to: "/portaria/encomendas" },
      { label: "Veículos", to: "/portaria/veiculos" },
      { label: "Prestadores", to: "/prestadores", roles: MANAGEMENT },
    ],
  },

  {
    // pai = união dos filhos (DOORMAN vê só Moradores).
    label: "Cadastros",
    icon: Contact,
    roles: ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"],
    children: [
      { label: "Unidades", to: "/unidades", roles: MANAGEMENT },
      { label: "Moradores", to: "/moradores" },
      { label: "Pets", to: "/pets", roles: MANAGEMENT },
      { label: "Funcionários", to: "/funcionarios", roles: MANAGEMENT },
    ],
  },

  {
    label: "Financeiro",
    icon: Banknote,
    roles: MANAGEMENT,
    children: [
      { label: "Visão Geral", to: "/financeiro" },
      { label: "Cobranças", to: "/financeiro/cobrancas" },
      { label: "Categorias", to: "/financeiro/categorias" },
      { label: "Multas", to: "/multas" },
      { label: "Contratos", to: "/contratos" },
    ],
  },

  {
    // pai = COUNCIL_COMMUNITY (residente vê Áreas/Galeria).
    label: "Espaços & Recursos",
    icon: Palette,
    roles: COUNCIL_COMMUNITY,
    children: [
      { label: "Áreas Comuns", to: "/areas-comuns" },
      { label: "Estoque", to: "/estoque", roles: MANAGEMENT },
      { label: "Obras", to: "/obras", roles: MANAGEMENT },
      { label: "Galeria", to: "/galeria" },
      { label: "TV Elevador", to: "/digital-signage", roles: MANAGEMENT },
    ],
  },

  {
    // pai = ALL_AUTH (todos veem Chamados).
    label: "Operacional",
    icon: Wrench,
    roles: ALL_AUTH,
    children: [
      { label: "Manutenção", to: "/manutencao", roles: MANAGEMENT },
      { label: "Chamados", to: "/chamados" },
    ],
  },

  { label: "Relatórios", to: "/relatorios", icon: BarChart3, roles: MANAGEMENT },

  {
    label: "Comunicação",
    icon: Megaphone,
    roles: ALL_AUTH,
    children: [
      { label: "Avisos", to: "/comunicacao/avisos" },
      { label: "Ocorrências", to: "/comunicacao/ocorrencias" },
      { label: "Achados e Perdidos", to: "/comunicacao/achados-e-perdidos", roles: RESIDENT_MANAGEMENT },
      { label: "Assembleias", to: "/assembleias", roles: ["COUNCIL_MEMBER", ...MANAGEMENT] },
    ],
  },

  {
    // pai = COUNCIL_COMMUNITY (residente vê Documentos; outros itens
    // ficam visíveis só para MANAGEMENT).
    label: "Configurações",
    icon: Settings,
    roles: COUNCIL_COMMUNITY,
    children: [
      { label: "Controle de Acesso", to: "/acesso", roles: MANAGEMENT },
      { label: "Dados do Condomínio", to: "/configuracoes", roles: MANAGEMENT },
      { label: "Documentos", to: "/documentos" },
      { label: "Convites", to: "/convites", roles: MANAGEMENT },
      { label: "Auditoria", to: "/auditoria", roles: MANAGEMENT },
      { label: "Painel do Síndico", to: "/painel-sindico", roles: MANAGEMENT },
    ],
  },

  {
    label: "Admin SaaS",
    icon: Crown,
    roles: ["SUPER_ADMIN"],
    children: [
      { label: "Painel SaaS", to: "/admin/saas" },
      { label: "Condomínios", to: "/admin/condominios" },
      { label: "Novo Condomínio (Wizard)", to: "/admin/onboarding" },
      { label: "Planos", to: "/admin/planos" },
      { label: "Marketplace", to: "/marketplace" },
    ],
  },

  {
    label: "Minha Portaria",
    icon: DoorOpen,
    roles: ["RESIDENT"],
    children: [
      { label: "Minhas Visitas", to: "/minha-portaria/visitantes" },
      { label: "Minhas Obras", to: "/minha-portaria/obras" },
      { label: "Visitantes Recorrentes", to: "/minha-portaria/visitantes-recorrentes" },
      { label: "Minhas Cobranças", to: "/minhas-cobrancas" },
    ],
  },
];

interface SidebarProps {
  /** Mobile drawer open */
  open: boolean;
  onClose: () => void;
  /** Desktop mini-rail (só ícones, 64px) */
  collapsed?: boolean;
}

export function Sidebar({ open, onClose, collapsed = false }: SidebarProps) {
  const { user, logout, selectedCondominiumId, setSelectedCondominium } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  /** Retorna true se o pathname atual bate com a rota de algum child. */
  const isChildActive = (children?: NavChild[]) =>
    !!children?.some(
      (c) =>
        location.pathname === c.to ||
        location.pathname.startsWith(c.to + "/"),
    );

  /** Grupos com filho ativo abrem automaticamente; o resto fica colapsado. */
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navItems
      .filter((i) => isChildActive(i.children))
      .map((i) => i.label),
  );
  // Quando a rota muda, garante que o grupo da rota ativa está aberto
  // (sem fechar os outros que o usuário já abriu manualmente).
  useEffect(() => {
    setExpandedItems((prev) => {
      const need = navItems
        .filter((i) => isChildActive(i.children))
        .map((i) => i.label)
        .filter((l) => !prev.includes(l));
      return need.length ? [...prev, ...need] : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [condominiums, setCondominiums] = useState<{ id: string; name: string }[]>([]);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Carrega lista de condomínios uma vez (SUPER_ADMIN) ou seleciona o
  // primeiro vínculo (demais roles). selectedCondominiumId fica fora
  // das deps porque a leitura é via setter funcional para evitar loop
  // quando o setState dispara re-render.
  useEffect(() => {
    if (isSuperAdmin) {
      api
        .get("/condominiums")
        .then((res) => {
          const list = res.data?.data?.condominiums ?? [];
          setCondominiums(list);
          if (list.length > 0) {
            // Só atribui se ainda não há selecionado — checagem via store
            // atual (useAuthStore.getState) para não depender do closure.
            const current = useAuthStore.getState().selectedCondominiumId;
            if (!current) setSelectedCondominium(list[0].id);
          }
        })
        .catch(() => {});
    } else {
      const current = useAuthStore.getState().selectedCondominiumId;
      if (!current && user?.condominiumUsers?.[0]) {
        setSelectedCondominium(user.condominiumUsers[0].condominium.id);
      }
    }
  }, [isSuperAdmin, user?.condominiumUsers, setSelectedCondominium]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const handleLogout = async () => {
    logout();
    navigate("/login");
  };

  const condominium = user?.condominiumUsers?.find(
    (c) => c.condominium.id === selectedCondominiumId,
  )?.condominium;

  const filteredItems = navItems
    .filter((item) => !item.roles || item.roles.includes(user?.role || ""))
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (c) => !c.roles || c.roles.includes(user?.role || ""),
      ),
    }))
    .filter((item) => !item.children || item.children.length > 0 || item.to);

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white transition-all duration-300",
          // Mobile: drawer com translate
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: width depende de collapsed
          collapsed ? "lg:w-16 w-64" : "w-64",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className={cn("flex items-center gap-2", collapsed && "lg:justify-center lg:w-full")}>
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            {!collapsed && <span className="font-bold text-lg">CondoSync</span>}
          </div>
          <button
            onClick={onClose}
            title="Fechar menu"
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Condomínio ativo (oculto em collapsed) */}
        {!collapsed && isSuperAdmin && (
          <div className="px-4 py-3 bg-slate-800 mx-3 mt-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Condomínio ativo</p>
            <select
              aria-label="Selecionar condomínio"
              value={selectedCondominiumId ?? ""}
              onChange={(e) => setSelectedCondominium(e.target.value)}
              className="w-full bg-slate-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {condominiums.length === 0 && (
                <option value="">Nenhum condomínio</option>
              )}
              {condominiums.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {!collapsed && !isSuperAdmin && condominium && (
          <div className="px-4 py-3 bg-slate-800 mx-3 mt-3 rounded-lg">
            <p className="text-xs text-slate-400">Condomínio ativo</p>
            <p className="font-medium text-sm truncate">{condominium.name}</p>
          </div>
        )}

        {/* Navegação */}
        <nav className={cn("flex-1 overflow-y-auto overflow-x-visible py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
          {filteredItems.map((item) => {
            if (item.children && item.children.length > 0) {
              const isExpanded = expandedItems.includes(item.label);

              const hasActiveChild = isChildActive(item.children);
              const panelId = `nav-panel-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

              // Modo collapsed: ícone com popover ao hover/focus
              if (collapsed) {
                return (
                  <div key={item.label} className="relative group">
                    <button
                      title={item.label}
                      aria-label={item.label}
                      aria-haspopup="menu"
                      aria-expanded="false"
                      className={cn(
                        "w-full flex items-center justify-center p-2 rounded-lg transition-colors",
                        hasActiveChild
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                    </button>
                    <div
                      role="menu"
                      aria-label={item.label}
                      className="hidden group-hover:block group-focus-within:block absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 min-w-[200px] max-w-[260px] z-50"
                    >
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-700 mb-1">
                        {item.label}
                      </div>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          role="menuitem"
                          className={({ isActive }) =>
                            cn(
                              "block px-3 py-1.5 text-sm rounded mx-1 whitespace-nowrap",
                              isActive
                                ? "bg-blue-600 text-white"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white",
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }

              // Modo expandido: accordion clássico
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm",
                      hasActiveChild && !isExpanded
                        ? "bg-blue-600/20 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div id={panelId} className="ml-7 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "block px-3 py-2 rounded-lg text-sm transition-colors",
                              isActive
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-800",
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Link solto (Dashboard, Relatórios)
            if (collapsed) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to!}
                  end={item.to === "/"}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-center p-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer usuário */}
        <div className={cn("border-t border-slate-700 shrink-0", collapsed ? "p-2" : "p-4")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <NavLink
                to="/perfil"
                title={user?.name}
                className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold hover:ring-2 hover:ring-blue-300"
              >
                {user?.name.charAt(0).toUpperCase()}
              </NavLink>
              <button
                onClick={handleLogout}
                title="Sair"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <NavLink
                to="/perfil"
                className={({ isActive }) =>
                  cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white",
                  )
                }
              >
                <UserRound className="w-4 h-4" />
                <span>Meu Perfil</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
