import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import AuthLayout from './components/layouts/AuthLayout';
import MobileLayout from './components/layouts/MobileLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Home
import HomeGrid from './pages/home/HomeGrid';

// Portaria
import PortariaDashboard from './pages/portaria/PortariaDashboard';
import VisitantesPortaria from './pages/portaria/VisitantesPortaria';
import EncomendasPortaria from './pages/portaria/EncomendasPortaria';

// Morador
import MinhasVisitas from './pages/morador/MinhasVisitas';
import MinhasCobrancas from './pages/morador/MinhasCobrancas';
import Avisos from './pages/morador/Avisos';
import Pets from './pages/morador/Pets';

// Shared
import PerfilPage from './pages/shared/PerfilPage';
import PanicoPage from './pages/shared/PanicoPage';
import MarketplacePage from './pages/marketplace/MarketplacePage';

const DOORMAN_ROLES = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];

function PrivateRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
}

function RoleGuard({ roles }: { roles: string[] }) {
  const { user } = useAuthStore();
  const allowed = roles.includes(user?.role ?? '');
  return allowed ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const isDoorman = DOORMAN_ROLES.includes(role);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — auth only */}
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Route>

        {/* Protected */}
        <Route element={<PrivateRoute />}>
          {/* Pânico — full screen, no nav */}
          <Route path="/panico" element={<PanicoPage />} />

          {/* Main layout */}
          <Route element={<MobileLayout title="Início" />}>
            <Route path="/" element={<HomeGrid />} />
          </Route>

          {/* Portaria routes */}
          <Route element={<RoleGuard roles={DOORMAN_ROLES} />}>
            <Route element={<MobileLayout title="Dashboard Portaria" showBack={false} />}>
              <Route path="/portaria" element={<PortariaDashboard />} />
            </Route>
            <Route element={<MobileLayout title="Visitantes" showBack />}>
              <Route path="/portaria/visitantes" element={<VisitantesPortaria />} />
            </Route>
            <Route element={<MobileLayout title="Encomendas" showBack />}>
              <Route path="/portaria/encomendas" element={<EncomendasPortaria />} />
            </Route>
          </Route>

          {/* Morador routes */}
          <Route element={<MobileLayout title="Meus Visitantes" showBack />}>
            <Route path="/visitantes" element={<MinhasVisitas />} />
          </Route>
          <Route element={<MobileLayout title="Minhas Cobranças" showBack />}>
            <Route path="/cobranças" element={<MinhasCobrancas />} />
            <Route path="/cobrancas" element={<MinhasCobrancas />} />
          </Route>
          <Route element={<MobileLayout title="Avisos" showBack />}>
            <Route path="/avisos" element={<Avisos />} />
          </Route>
          <Route element={<MobileLayout title="Meus Pets" showBack />}>
            <Route path="/pets" element={<Pets />} />
          </Route>
          <Route element={<MobileLayout title="Perfil" showBack />}>
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>

          {/* Marketplace */}
          <Route element={<MobileLayout title="Marketplace" showBack />}>
            <Route path="/marketplace" element={<MarketplacePage />} />
          </Route>

          {/* Encomendas (morador view — read only) */}
          <Route element={<MobileLayout title="Encomendas" showBack />}>
            <Route path="/encomendas" element={<EncomendasPortaria />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
