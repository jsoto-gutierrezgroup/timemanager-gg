import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { UsersPage } from './pages/settings/users/UsersPage';
import { ClientesPage } from './pages/settings/clients/ClientesPage';
import { TarifasPage } from './pages/settings/rates/TarifasPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { TimesPage } from './pages/times/TimesPage';
import { WipPage } from './pages/wip/WipPage';
import { ApprovalPage } from './pages/billing/approval/ApprovalPage';
import { BillableObjectsPage } from './pages/billing/billable-objects/BillableObjectsPage';
import { InvoicesPage } from './pages/billing/invoices/InvoicesPage';
import { PaymentsPage } from './pages/billing/payments/PaymentsPage';
import { JobsPage } from './pages/billing/jobs/JobsPage';
import { BillingDashboardPage } from './pages/billing/dashboard/BillingDashboardPage';

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
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="times" element={<TimesPage />} />
        <Route path="wip-management" element={<WipPage />} />
        <Route path="business-approval" element={<ApprovalPage />} />
        <Route path="billable-objects" element={<BillableObjectsPage />} />
        <Route path="billing-dashboard" element={<BillingDashboardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="billing/list" element={<InvoicesPage />} />
        <Route path="payment/payments" element={<PaymentsPage />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="settings/clients" element={<ClientesPage />} />
        <Route path="settings/rates" element={<TarifasPage />} />
        <Route path="settings/periods" element={<PlaceholderPage title="Períodos de Facturación" />} />
        <Route path="settings/exchange-rates" element={<PlaceholderPage title="Tasas de Cambio" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
