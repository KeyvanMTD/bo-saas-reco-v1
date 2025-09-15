import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  Database, 
  Eye, 
  Settings,
  Zap,
  Activity,
  ListChecks,
  FileInput
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Catalog', href: '/catalog', icon: Package },
  { name: 'Mappings', href: '/mappings', icon: ArrowRightLeft },
  { name: 'Ingestions', href: '/ingestions', icon: FileInput },
  { name: 'Runs', href: '/runs', icon: Database },
  { name: 'Preview', href: '/preview', icon: Eye },
  { name: 'Performance', href: '/performance', icon: Activity },
  { name: 'Rules', href: '/rules', icon: ListChecks },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} h-screen bg-sidebar border-r border-border flex flex-col transition-all duration-200`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-3 border-b border-border justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-semibold text-sidebar-active-foreground">RecoAI</span>}
        </div>
        <button aria-label="Collapse" className="text-sidebar-foreground hover:text-sidebar-active-foreground" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        {/* Search */}
        <div className="px-2 mb-4">
          <input
            type="search"
            placeholder="Search..."
            className={`w-full ${collapsed ? 'opacity-0 pointer-events-none h-0' : 'h-9'} transition-all duration-200 rounded-md bg-background border border-border px-3 text-sm text-sidebar-foreground`}
          />
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  `w-full flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-active text-sidebar-active-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground'
                  }`
                }
              >
                <item.icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto border-t border-border p-2 flex flex-col gap-2">
        <NavLink to="/settings" className={({ isActive }) => `flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2 rounded-lg ${isActive ? 'bg-sidebar-active text-sidebar-active-foreground' : 'text-sidebar-foreground hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground'}`}>
          <Settings className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && 'Settings'}
        </NavLink>
        <button className={`flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-active/50 hover:text-sidebar-active-foreground`}>
          <div className={`w-6 h-6 rounded-full bg-muted ${collapsed ? '' : 'mr-2'}`} />
          {!collapsed && 'Profil'}
        </button>
      </div>
    </div>
  );
}