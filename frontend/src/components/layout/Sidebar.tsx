import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: string;
  to?: string;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: 'Inicio', icon: '🏠', to: '/' },
  { label: 'Tareas', icon: '📋', to: '/tasks' },
  { label: 'Tiempos', icon: '🕐', to: '/times' },
  { label: 'WIP', icon: '💵', to: '/wip-management' },
  {
    label: 'Facturación',
    icon: '📄',
    children: [
      { label: 'Aprobación', to: '/business-approval' },
      { label: 'Obj. Facturables', to: '/billable-objects' },
      { label: 'Dashboard', to: '/billing-dashboard' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'Facturación', to: '/billing/list' },
      { label: 'Pagos', to: '/payment/payments' },
    ],
  },
  {
    label: 'Ajustes',
    icon: '⚙️',
    children: [
      { label: 'Usuarios', to: '/settings/users' },
      { label: 'Clientes', to: '/settings/clients' },
      { label: 'Tarifas horarias', to: '/settings/rates' },
      { label: 'Períodos facturación', to: '/settings/periods' },
      { label: 'Tasas de cambio', to: '/settings/exchange-rates' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Ajustes: true,
  });
  const location = useLocation();

  function toggleMenu(label: string) {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function isChildActive(children: { to: string }[]) {
    return children.some((c) => location.pathname.startsWith(c.to));
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-30"
      style={{ width: collapsed ? 64 : 220 }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200 shrink-0">
        {collapsed ? (
          <span className="text-primary font-bold text-lg">TM</span>
        ) : (
          <span className="text-primary font-bold text-base">Time Manager</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          if (item.children) {
            const active = isChildActive(item.children);
            const open = openMenus[item.label];
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      <svg
                        className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Sub-items */}
                {!collapsed && open && (
                  <div className="pl-10">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          [
                            'block py-2 px-2 text-sm rounded-md transition-colors',
                            isActive
                              ? 'text-primary font-medium bg-primary/5'
                              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50',
                          ].join(' ')
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
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')
              }
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle button */}
      <div className="border-t border-gray-200 p-2 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expandir' : 'Contraer'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span className="ml-2 text-xs">Contraer</span>}
        </button>
      </div>
    </aside>
  );
}
