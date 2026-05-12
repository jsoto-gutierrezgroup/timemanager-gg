import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const routeTitles: Record<string, string> = {
  '/': 'Inicio',
  '/tasks': 'Tareas',
  '/times': 'Tiempos',
  '/wip-management': 'Gestión del WIP',
  '/business-approval': 'Aprobación',
  '/billable-objects': 'Objetos Facturables',
  '/billing-dashboard': 'Dashboard de Facturación',
  '/jobs': 'Jobs',
  '/billing/list': 'Facturación',
  '/payment/payments': 'Pagos',
  '/settings/users': 'Usuarios',
  '/settings/clients': 'Clientes',
  '/settings/rates': 'Tarifas Horarias',
  '/settings/periods': 'Períodos de Facturación',
  '/settings/exchange-rates': 'Tasas de Cambio',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface HeaderProps {
  sidebarWidth: number;
}

export function Header({ sidebarWidth }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const title = routeTitles[location.pathname] ?? 'Time Manager';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header
      className="fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-6 z-20 transition-all duration-200"
      style={{ left: sidebarWidth }}
    >
      {/* Page title */}
      <h1 className="text-base font-semibold text-gray-800 flex-1">{title}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
          <span className="text-lg">🔔</span>
        </button>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold"
              title={user.nombre}
            >
              {getInitials(user.nombre)}
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">{user.nombre}</span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
          title="Cerrar sesión"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
