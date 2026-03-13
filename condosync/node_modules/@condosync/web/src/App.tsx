import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { useAuthStore } from "./store/authStore";

// Layouts
import { AuthLayout } from "./components/layouts/AuthLayout";
import { AppLayout } from "./components/layouts/AppLayout";

// Páginas de Autenticação
import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

// Páginas do Sistema
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { VisitorsPage } from "./pages/portaria/VisitorsPage";
import { ParcelsPage } from "./pages/portaria/ParcelsPage";
import { VehiclesPage } from "./pages/portaria/VehiclesPage";
import { ResidentsPage } from "./pages/residents/ResidentsPage";
import { UnitsPage } from "./pages/units/UnitsPage";
import { FinancePage } from "./pages/finance/FinancePage";
import { ChargesPage } from "./pages/finance/ChargesPage";
import { MaintenancePage } from "./pages/maintenance/MaintenancePage";
import { CommonAreasPage } from "./pages/common-areas/CommonAreasPage";
import { AnnouncementsPage } from "./pages/communication/AnnouncementsPage";
import { OccurrencesPage } from "./pages/communication/OccurrencesPage";
import LostAndFoundPage from "./pages/communication/LostAndFoundPage";
import AssemblyList from "./pages/assemblies/AssemblyList";
import AssemblyDetail from "./pages/assemblies/AssemblyDetail";
import PetPage from "./pages/pets/PetPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { EmployeesPage } from "./pages/employees/EmployeesPage";
import { ServiceProvidersPage } from "./pages/service-providers/ServiceProvidersPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { CondominiumsPage } from "./pages/admin/CondominiumsPage";
import { MyVisitorsPage } from "./pages/minha-portaria/MyVisitorsPage";
import MinhasObrasPage from "./pages/minha-portaria/MinhasObrasPage";
import ObrasAdminPage from "./pages/obras/ObrasAdminPage";
import { DocumentsPage } from "./pages/documents/DocumentsPage";
import StockPage from "./pages/stock/StockPage";
import TicketsPage from "./pages/tickets/TicketsPage";
import GalleryPage from "./pages/gallery/GalleryPage";
import MyChargesPage from "./pages/finance/MyChargesPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
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
              <RoleGuard roles={STAFF}>
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
            path="financeiro/cobranças"
            element={
              <RoleGuard roles={MANAGEMENT}>
                <ChargesPage />
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
              <RoleGuard roles={COMMUNITY}>
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
              <RoleGuard roles={COMMUNITY}>
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
              <RoleGuard roles={STAFF}>
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
              <RoleGuard roles={COMMUNITY}>
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
              <RoleGuard roles={COMMUNITY}>
                <GalleryPage />
              </RoleGuard>
            }
          />

          {/* Cobranças do morador */}
          <Route
            path="minhas-cobranças"
            element={
              <RoleGuard roles={["RESIDENT"]}>
                <MyChargesPage />
              </RoleGuard>
            }
          />

          {/* Perfil e Configurações */}
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>

        {/* Redirecionar rotas desconhecidas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </BrowserRouter>
  );
}
