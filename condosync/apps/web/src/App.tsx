import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "./components/ui/toaster";
import { useAuthStore } from "./store/authStore";
import { connectRealtime } from "./services/socket";

// Layouts (carregamento síncrono — fazem parte da casca da app)
import { AuthLayout } from "./components/layouts/AuthLayout";
import { AppLayout } from "./components/layouts/AppLayout";

// Helper para lazy-load de export nomeado.
// React.lazy só aceita módulo com `default`; este wrapper permite
// usar páginas que exportam por nome sem precisar refatorá-las todas.
const lazyNamed = <T extends string>(
  importer: () => Promise<Record<T, ComponentType<unknown>>>,
  exportName: T,
) =>
  lazy(() =>
    importer().then((mod) => ({ default: mod[exportName] })),
  );

// ─── Auth ──────────────────────────────────────────────────────
const LoginPage = lazyNamed(
  () => import("./pages/auth/LoginPage") as any,
  "LoginPage",
);
const ForgotPasswordPage = lazyNamed(
  () => import("./pages/auth/ForgotPasswordPage") as any,
  "ForgotPasswordPage",
);
const AcceptInvitePage = lazyNamed(
  () => import("./pages/auth/AcceptInvitePage") as any,
  "AcceptInvitePage",
);

// ─── Sistema (named exports) ───────────────────────────────────
const DashboardPage = lazyNamed(
  () => import("./pages/dashboard/DashboardPage") as any,
  "DashboardPage",
);
const VisitorsPage = lazyNamed(
  () => import("./pages/portaria/VisitorsPage") as any,
  "VisitorsPage",
);
const ParcelsPage = lazyNamed(
  () => import("./pages/portaria/ParcelsPage") as any,
  "ParcelsPage",
);
const VehiclesPage = lazyNamed(
  () => import("./pages/portaria/VehiclesPage") as any,
  "VehiclesPage",
);
const ResidentsPage = lazyNamed(
  () => import("./pages/residents/ResidentsPage") as any,
  "ResidentsPage",
);
const UnitsPage = lazyNamed(
  () => import("./pages/units/UnitsPage") as any,
  "UnitsPage",
);
const FinancePage = lazyNamed(
  () => import("./pages/finance/FinancePage") as any,
  "FinancePage",
);
const ChargesPage = lazyNamed(
  () => import("./pages/finance/ChargesPage") as any,
  "ChargesPage",
);
const FinanceCategoriesPage = lazyNamed(
  () => import("./pages/finance/FinanceCategoriesPage") as any,
  "FinanceCategoriesPage",
);
const MaintenancePage = lazyNamed(
  () => import("./pages/maintenance/MaintenancePage") as any,
  "MaintenancePage",
);
const CommonAreasPage = lazyNamed(
  () => import("./pages/common-areas/CommonAreasPage") as any,
  "CommonAreasPage",
);
const AnnouncementsPage = lazyNamed(
  () => import("./pages/communication/AnnouncementsPage") as any,
  "AnnouncementsPage",
);
const OccurrencesPage = lazyNamed(
  () => import("./pages/communication/OccurrencesPage") as any,
  "OccurrencesPage",
);
const ReportsPage = lazyNamed(
  () => import("./pages/reports/ReportsPage") as any,
  "ReportsPage",
);
const EmployeesPage = lazyNamed(
  () => import("./pages/employees/EmployeesPage") as any,
  "EmployeesPage",
);
const ServiceProvidersPage = lazyNamed(
  () => import("./pages/service-providers/ServiceProvidersPage") as any,
  "ServiceProvidersPage",
);
const ProfilePage = lazyNamed(
  () => import("./pages/profile/ProfilePage") as any,
  "ProfilePage",
);
const SettingsPage = lazyNamed(
  () => import("./pages/settings/SettingsPage") as any,
  "SettingsPage",
);
const CondominiumsPage = lazyNamed(
  () => import("./pages/admin/CondominiumsPage") as any,
  "CondominiumsPage",
);
const PlansPage = lazyNamed(
  () => import("./pages/admin/PlansPage") as any,
  "PlansPage",
);
const InvitationsPage = lazyNamed(
  () => import("./pages/admin/InvitationsPage") as any,
  "InvitationsPage",
);
const MyVisitorsPage = lazyNamed(
  () => import("./pages/minha-portaria/MyVisitorsPage") as any,
  "MyVisitorsPage",
);
const VisitorRecurrencesPage = lazyNamed(
  () => import("./pages/minha-portaria/VisitorRecurrencesPage") as any,
  "VisitorRecurrencesPage",
);
const DocumentsPage = lazyNamed(
  () => import("./pages/documents/DocumentsPage") as any,
  "DocumentsPage",
);

// ─── Default exports (usam React.lazy direto) ──────────────────
const LostAndFoundPage = lazy(
  () => import("./pages/communication/LostAndFoundPage"),
);
const AssemblyList = lazy(() => import("./pages/assemblies/AssemblyList"));
const AssemblyDetail = lazy(() => import("./pages/assemblies/AssemblyDetail"));
const PetPage = lazy(() => import("./pages/pets/PetPage"));
const MinhasObrasPage = lazy(
  () => import("./pages/minha-portaria/MinhasObrasPage"),
);
const ObrasAdminPage = lazy(() => import("./pages/obras/ObrasAdminPage"));
const StockPage = lazy(() => import("./pages/stock/StockPage"));
const TicketsPage = lazy(() => import("./pages/tickets/TicketsPage"));
const GalleryPage = lazy(() => import("./pages/gallery/GalleryPage"));
const MyChargesPage = lazy(() => import("./pages/finance/MyChargesPage"));
const MarketplaceAdminPage = lazy(
  () => import("./pages/marketplace/MarketplaceAdminPage"),
);
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const AccessControlPage = lazy(
  () => import("./pages/access/AccessControlPage"),
);
const DigitalSignagePage = lazy(
  () => import("./pages/digital-signage/DigitalSignagePage"),
);
const DisplayPage = lazy(() => import("./pages/digital-signage/DisplayPage"));
const FinesPage = lazy(() => import("./pages/fines/FinesPage"));
const ContractsPage = lazy(() => import("./pages/contracts/ContractsPage"));

// Fallback simples de carregamento — a casca (AppLayout) já está
// renderizada, então não precisa ser elaborado.
function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/home" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

const STAFF = ["CONDOMINIUM_ADMIN", "SYNDIC", "DOORMAN", "SUPER_ADMIN"];
const MANAGEMENT = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"];
const COMMUNITY = [
  "RESIDENT",
  "DOORMAN",
  "CONDOMINIUM_ADMIN",
  "SYNDIC",
  "SUPER_ADMIN",
  "SERVICE_PROVIDER",
];
// Áreas sem acesso de porteiro nem prestador (conteúdo de moradores/gestão)
const RESIDENT_MANAGEMENT = [
  "RESIDENT",
  "CONDOMINIUM_ADMIN",
  "SYNDIC",
  "SUPER_ADMIN",
];

function RoleGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const user = useAuthStore((s) => s.user);
  if (!roles.includes(user?.role ?? "")) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const selectedCondominiumId = useAuthStore((s) => s.selectedCondominiumId);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !userId) return;
    return connectRealtime(accessToken, userId, selectedCondominiumId);
  }, [isAuthenticated, accessToken, userId, selectedCondominiumId]);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Landing page */}
          <Route
            path="/home"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* Display TV — rota pública, sem layout */}
          <Route path="/display/:token" element={<DisplayPage />} />

          {/* Rotas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <AuthLayout>
                  <ForgotPasswordPage />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/aceitar-convite/:token"
            element={
              <PublicRoute>
                <AuthLayout>
                  <AcceptInvitePage />
                </AuthLayout>
              </PublicRoute>
            }
          />

          {/* Rotas privadas */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Portaria */}
            <Route
              path="portaria/visitantes"
              element={
                <RoleGuard roles={STAFF}>
                  <VisitorsPage />
                </RoleGuard>
              }
            />
            <Route
              path="portaria/encomendas"
              element={
                <RoleGuard roles={STAFF}>
                  <ParcelsPage />
                </RoleGuard>
              }
            />
            <Route
              path="portaria/veiculos"
              element={
                <RoleGuard roles={STAFF}>
                  <VehiclesPage />
                </RoleGuard>
              }
            />

            {/* Moradores */}
            <Route
              path="moradores"
              element={
                <RoleGuard roles={STAFF}>
                  <ResidentsPage />
                </RoleGuard>
              }
            />
            <Route
              path="unidades"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <UnitsPage />
                </RoleGuard>
              }
            />

            {/* Financeiro */}
            <Route
              path="financeiro"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <FinancePage />
                </RoleGuard>
              }
            />
            <Route
              path="financeiro/cobrancas"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <ChargesPage />
                </RoleGuard>
              }
            />
            <Route
              path="financeiro/categorias"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <FinanceCategoriesPage />
                </RoleGuard>
              }
            />

            {/* Manutenção */}
            <Route
              path="manutencao"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <MaintenancePage />
                </RoleGuard>
              }
            />

            {/* Áreas Comuns */}
            <Route
              path="areas-comuns"
              element={
                <RoleGuard roles={RESIDENT_MANAGEMENT}>
                  <CommonAreasPage />
                </RoleGuard>
              }
            />

            {/* Comunicação */}
            <Route
              path="comunicacao/avisos"
              element={
                <RoleGuard roles={COMMUNITY}>
                  <AnnouncementsPage />
                </RoleGuard>
              }
            />
            <Route
              path="comunicacao/ocorrencias"
              element={
                <RoleGuard roles={COMMUNITY}>
                  <OccurrencesPage />
                </RoleGuard>
              }
            />
            <Route
              path="comunicacao/achados-e-perdidos"
              element={
                <RoleGuard roles={RESIDENT_MANAGEMENT}>
                  <LostAndFoundPage />
                </RoleGuard>
              }
            />
            <Route
              path="assembleias"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <AssemblyList />
                </RoleGuard>
              }
            />
            <Route
              path="assembleias/:id"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <AssemblyDetail />
                </RoleGuard>
              }
            />
            <Route
              path="pets"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <PetPage />
                </RoleGuard>
              }
            />

            {/* Relatórios */}
            <Route
              path="relatorios"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <ReportsPage />
                </RoleGuard>
              }
            />

            {/* Funcionários e Prestadores */}
            <Route
              path="funcionarios"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <EmployeesPage />
                </RoleGuard>
              }
            />
            <Route
              path="prestadores"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <ServiceProvidersPage />
                </RoleGuard>
              }
            />

            {/* Admin */}
            <Route
              path="admin/condominios"
              element={
                <RoleGuard roles={["SUPER_ADMIN"]}>
                  <CondominiumsPage />
                </RoleGuard>
              }
            />
            <Route
              path="admin/planos"
              element={
                <RoleGuard roles={["SUPER_ADMIN"]}>
                  <PlansPage />
                </RoleGuard>
              }
            />
            <Route
              path="convites"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <InvitationsPage />
                </RoleGuard>
              }
            />

            {/* Portal do Morador */}
            <Route
              path="minha-portaria/visitantes"
              element={
                <RoleGuard roles={["RESIDENT"]}>
                  <MyVisitorsPage />
                </RoleGuard>
              }
            />
            <Route
              path="minha-portaria/obras"
              element={
                <RoleGuard roles={["RESIDENT"]}>
                  <MinhasObrasPage />
                </RoleGuard>
              }
            />
            <Route
              path="minha-portaria/visitantes-recorrentes"
              element={
                <RoleGuard roles={["RESIDENT"]}>
                  <VisitorRecurrencesPage />
                </RoleGuard>
              }
            />

            {/* Obras (admin/síndico) */}
            <Route
              path="obras"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <ObrasAdminPage />
                </RoleGuard>
              }
            />

            {/* Documentos */}
            <Route
              path="documentos"
              element={
                <RoleGuard roles={RESIDENT_MANAGEMENT}>
                  <DocumentsPage />
                </RoleGuard>
              }
            />

            {/* Estoque */}
            <Route
              path="estoque"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <StockPage />
                </RoleGuard>
              }
            />

            {/* Chamados */}
            <Route
              path="chamados"
              element={
                <RoleGuard roles={COMMUNITY}>
                  <TicketsPage />
                </RoleGuard>
              }
            />

            {/* Galeria de Fotos */}
            <Route
              path="galeria"
              element={
                <RoleGuard roles={RESIDENT_MANAGEMENT}>
                  <GalleryPage />
                </RoleGuard>
              }
            />

            {/* Cobranças do morador */}
            <Route
              path="minhas-cobrancas"
              element={
                <RoleGuard roles={["RESIDENT"]}>
                  <MyChargesPage />
                </RoleGuard>
              }
            />

            {/* Marketplace */}
            <Route
              path="marketplace"
              element={
                <RoleGuard roles={["SUPER_ADMIN"]}>
                  <MarketplaceAdminPage />
                </RoleGuard>
              }
            />

            {/* Controle de Acesso */}
            <Route
              path="acesso"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <AccessControlPage />
                </RoleGuard>
              }
            />

            {/* Multas condominiais */}
            <Route
              path="multas"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <FinesPage />
                </RoleGuard>
              }
            />

            {/* Contratos condominiais */}
            <Route
              path="contratos"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <ContractsPage />
                </RoleGuard>
              }
            />

            {/* Digital Signage */}
            <Route
              path="digital-signage"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <DigitalSignagePage />
                </RoleGuard>
              }
            />

            {/* Perfil e Configurações */}
            <Route path="perfil" element={<ProfilePage />} />
            <Route
              path="configuracoes"
              element={
                <RoleGuard roles={MANAGEMENT}>
                  <SettingsPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Redirecionar rotas desconhecidas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <Toaster />
    </BrowserRouter>
  );
}
