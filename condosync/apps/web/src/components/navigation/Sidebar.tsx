import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutDashboard,
  Users,
  Home,
  DollarSign,
  Wrench,
  CalendarDays,
  Megaphone,
  AlertTriangle,
  BarChart3,
  UserCog,
  Building,
  Shield,
  Package,
  Car,
  LogOut,
  ChevronDown,
  Building2,
  X,
  PawPrint,
  FileText,
  Ticket,
  Image,
  Vote,
  PackageSearch,
  HardHat,
  DoorOpen,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../services/api";

interface NavItem {
  label: string;
  to?: string;
  icon: React.ElementType;
  children?: { label: string; to: string; roles?: string[] }[];
  roles?: string[];
}

const MANAGEMENT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];
const RESIDENT_MANAGEMENT = ["RESIDENT", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  {
    label: "Portaria",
    icon: Shield,
    roles: ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"],
    children: [
      { label: "Visitantes", to: "/portaria/visitantes" },
      { label: "Encomendas", to: "/portaria/encomendas" },
      { label: "Veículos", to: "/portaria/veiculos" },
      { label: "Prestadores", to: "/prestadores", roles: MANAGEMENT },
    ],
  },
  {
    label: "Unidades",
    to: "/unidades",
    icon: Home,
    roles: MANAGEMENT,
  },
  {
    label: "Moradores",
    to: "/moradores",
    icon: Users,
    roles: ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"],
  },
  {
    label: "Pets",
    to: "/pets",
    icon: PawPrint,
    roles: MANAGEMENT,
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    roles: MANAGEMENT,
    children: [
      { label: "Visão Geral", to: "/financeiro" },
      { label: "Cobranças", to: "/financeiro/cobrancas" },
      { label: "Categorias", to: "/financeiro/categorias" },
    ],
  },
  { label: "Manutenção", to: "/manutencao", icon: Wrench, roles: MANAGEMENT },
  {
    label: "Áreas Comuns",
    to: "/areas-comuns",
    icon: CalendarDays,
    roles: RESIDENT_MANAGEMENT,
  },
  {
    label: "Comunicação",
    icon: Megaphone,
    roles: ["RESIDENT", "DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN", "SERVICE_PROVIDER"],
    children: [
      { label: "Avisos", to: "/comunicacao/avisos" },
      { label: "Ocorrências", to: "/comunicacao/ocorrencias" },
      { label: "Achados e Perdidos", to: "/comunicacao/achados-e-perdidos", roles: RESIDENT_MANAGEMENT },
      { label: "Assembleias", to: "/assembleias", roles: MANAGEMENT },
    ],
  },
  {
    label: "Documentos",
    to: "/documentos",
    icon: FileText,
    roles: RESIDENT_MANAGEMENT,
  },
  {
    label: "Chamados",
    to: "/chamados",
    icon: Ticket,
    roles: ["RESIDENT", "DOORMAN", "CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN", "SERVICE_PROVIDER"],
  },
  {
    label: "Galeria",
    to: "/galeria",
    icon: Image,
    roles: RESIDENT_MANAGEMENT,
  },
  {
    label: "Estoque",
    to: "/estoque",
    icon: Package,
    roles: MANAGEMENT,
  },
  {
    label: "Obras",
    to: "/obras",
    icon: HardHat,
    roles: MANAGEMENT,
  },
  {
    label: "Relatórios",
    to: "/relatorios",
    icon: BarChart3,
    roles: MANAGEMENT,
  },
  {
    label: "Funcionários",
    to: "/funcionarios",
    icon: UserCog,
    roles: MANAGEMENT,
  },
  {
    label: "Controle de Acesso",
    to: "/acesso",
    icon: KeyRound,
    roles: MANAGEMENT,
  },
  {
    label: "Condomínios",
    to: "/admin/condominios",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: Building,
    roles: ["SUPER_ADMIN"],
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
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout, selectedCondominiumId, setSelectedCondominium } =
    useAuthStore();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Portaria",
    "Financeiro",
    "Comunicação",
  ]);
  const [condominiums, setCondominiums] = useState<
    { id: string; name: string }[]
  >([]);
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
          "fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 bg-slate-900 text-white transition-transform duration-300",
          open
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">CondoSync</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Condomínio selecionado */}
        {isSuperAdmin ? (
          <div className="px-4 py-3 bg-slate-800 mx-3 mt-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Condomínio ativo</p>
            <select
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
        ) : condominium ? (
          <div className="px-4 py-3 bg-slate-800 mx-3 mt-3 rounded-lg">
            <p className="text-xs text-slate-400">Condomínio ativo</p>
            <p className="font-medium text-sm truncate">{condominium.name}</p>
          </div>
        ) : null}

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems
            .filter(
              (item) => !item.roles || item.roles.includes(user?.role || ""),
            )
            .map((item) => {
              if (item.children) {
                const isExpanded = expandedItems.includes(item.label);
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
                        {item.children
                          .filter((child) => !child.roles || child.roles.includes(user?.role || ""))
                          .map((child) => (
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

        {/* Usuário / logout */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
