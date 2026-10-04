import { ReactNode } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Gamepad2, Signal, ListChecks, Bot, BarChart3, Settings, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/withdrawals', icon: CreditCard, label: 'Withdrawals' },
  { path: '/games', icon: Gamepad2, label: 'Games Config' },
  { path: '/ads', icon: Signal, label: 'Ads Config' },
  { path: '/tasks', icon: ListChecks, label: 'Tasks Config' },
  { path: '/bot', icon: Bot, label: 'Bot Config' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { admin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <aside className={cn(
        'fixed left-0 top-0 h-full bg-dark-900/95 backdrop-blur-xl border-r border-dark-800 z-40 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20',
        mobileMenuOpen && 'lg:hidden fixed inset-y-0 left-0 z-50'
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-dark-800">
            <Link to="/dashboard" className="flex items-center gap-2" style={{ width: sidebarOpen ? 'auto' : '0' }}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              {sidebarOpen && <span className="font-bold text-lg gradient-text">RushOnCash</span>}
            </Link>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                )}
                style={{ paddingLeft: sidebarOpen ? '12px' : '8px' }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-dark-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div className="flex-1 min-w-0" style={{ display: sidebarOpen ? 'block' : 'none' }}>
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-dark-500 truncate">Administrator</p>
              </div>
            </div>
            <button onClick={logout} className="w-full mt-3 btn-secondary justify-center">
              <LogOut className="w-4 h-4" />
              <span style={{ display: sidebarOpen ? 'inline' : 'none' }}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className={cn(
        'flex-1 min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        <header className="sticky top-0 z-30 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800">
          <div className="flex items-center justify-between h-16 px-6">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-dark-800"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 lg:hidden"></div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-dark-400 hidden sm:block">
                RushOnCash Admin
              </span>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import { useState } from 'react';