import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutGrid,
  UsersRound,
  Home,
  Banknote,
  Settings2,
  CalendarRange,
  Megaphone,
  BarChart3,
  UserRoundCog,
  Building2,
  ShieldCheck,
  PackageOpen,
  LogOut,
  ChevronDown,
  X,
  PawPrint,
  Ticket,
  Image as ImageIcon,
  HardHat,
  DoorOpen,
  Settings,
  UserRound,
  MonitorPlay,
  FileSignature,
  Gavel,
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
const RESIDENT_MANAGEMENT = ["RESIDENT", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];
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
    label: "Cadastros",
    icon: Contact,
    roles: MANAGEMENT,
    children: [
      { label: "Unidades", to: "/unidades" },
      { label: "Moradores", to: "/moradores", roles: ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"] },
      { label: "Pets", to: "/pets" },
      { label: "Funcionários", to: "/funcionarios" },
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
    label: "Espaços & Recursos",
    icon: Palette,
    roles: MANAGEMENT,
    children: [
      { label: "Áreas Comuns", to: "/areas-comuns", roles: COUNCIL_COMMUNITY },
      { label: "Estoque", to: "/estoque" },
      { label: "Obras", to: "/obras" },
      { label: "Galeria", to: "/galeria", roles: COUNCIL_COMMUNITY },
      { label: "TV Elevador", to: "/digital-signage" },
    ],
  },

  {
    label: "Operacional",
    icon: Wrench,
    roles: MANAGEMENT,
    children: [
      { label: "Manutenção", to: "/manutencao" },
      { label: "Chamados", to: "/chamados", roles: ALL_AUTH },
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
    label: "Configurações",
    icon: Settings,
    roles: MANAGEMENT,
    children: [
      { label: "Controle de Acesso", to: "/acesso" },
      { label: "Dados do Condomínio", to: "/configuracoes" },
      { label: "Documentos", to: "/documentos", roles: COUNCIL_COMMUNITY },
      { label: "Convites", to: "/convites" },
      { label: "Auditoria", to: "/auditoria" },
      { label: "Painel do Síndico", to: "/painel-sindico" },
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
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Portaria",
    "Financeiro",
    "Comunicação",
    "Configurações",
  ]);
  const [condominiums, setCondominiums] = useState<{ id: string; name: string }[]>([]);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      api
        .get("/condominiums")
        .then((res) => {
          const list = res.data?.data?.condominiums ?? [];
          setCondominiums(list);
          if (!selectedCondominiumId && list.length > 0) {
            setSelectedCondominium(list[0].id);
          }
        })
        .catch(() => {});
    } else if (!selectedCondominiumId && user?.condominiumUsers?.[0]) {
      setSelectedCondominium(user.condominiumUsers[0].condominium.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, user?.condominiumUsers]);

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
        <div
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

              // Modo collapsed: ícone com popover ao hover
              if (collapsed) {
                return (
                  <div key={item.label} className="relative group">
                    <button
                      title={item.label}
                      className="w-full flex items-center justify-center p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                    </button>
                    <div className="hidden group-hover:block absolute left-full top-0 ml-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 min-w-[200px] z-50">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-700 mb-1">
                        {item.label}
                      </div>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "block px-3 py-1.5 text-sm rounded mx-1",
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm"
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
                    <div className="ml-7 mt-1 space-y-1">
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
