import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { UsersPage } from './pages/settings/users/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">Módulo en desarrollo</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/settings/users" replace />} />
        <Route path="tasks" element={<PlaceholderPage title="Tareas" />} />
        <Route path="times" element={<PlaceholderPage title="Tiempos" />} />
        <Route path="wip-management" element={<PlaceholderPage title="Gestión del WIP" />} />
        <Route path="business-approval" element={<PlaceholderPage title="Aprobación" />} />
        <Route path="billable-objects" element={<PlaceholderPage title="Objetos Facturables" />} />
        <Route path="billing-dashboard" element={<PlaceholderPage title="Dashboard de Facturación" />} />
        <Route path="jobs" element={<PlaceholderPage title="Jobs" />} />
        <Route path="billing/list" element={<PlaceholderPage title="Facturación" />} />
        <Route path="payment/payments" element={<PlaceholderPage title="Pagos" />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="settings/clients" element={<PlaceholderPage title="Clientes" />} />
        <Route path="settings/rates" element={<PlaceholderPage title="Tarifas Horarias" />} />
        <Route path="settings/periods" element={<PlaceholderPage title="Períodos de Facturación" />} />
        <Route path="settings/exchange-rates" element={<PlaceholderPage title="Tasas de Cambio" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
