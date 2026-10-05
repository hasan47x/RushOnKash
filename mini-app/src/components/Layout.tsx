import { useEffect, useState, ReactNode } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Gamepad2, ListChecks, Wallet, User, Trophy, Share2 } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { cn } from '../utils/cn';

const navItems = [
  { path: '/', icon: Home, label: 'Home', exact: true },
  { path: '/games', icon: Gamepad2, label: 'Games' },
  { path: '/tasks', icon: ListChecks, label: 'Tasks' },
  { path: '/withdraw', icon: Wallet, label: 'Withdraw' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const { webApp, setHeaderColor, setBackgroundColor } = useTelegram();
  const { user } = useAuth();
  const { config } = useConfig();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (webApp) {
      setHeaderColor('#0f172a');
      setBackgroundColor('#020617');
    }
  }, [webApp, setHeaderColor, setBackgroundColor]);

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && path !== '/';
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <header className="sticky top-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl gradient-text">RushOnCash</span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/referral" className="btn-ghost p-2">
              <Share2 className="w-5 h-5" />
            </Link>
            <Link to="/leaderboard" className="btn-ghost p-2">
              <Trophy className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 pb-24">
        {children ?? <Outlet />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-dark-950/95 backdrop-blur-xl border-t border-dark-800 z-50">
        <div className="grid grid-cols-5">
          {navItems.map(({ path, icon: Icon, label, exact }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all duration-200',
                isActive(path, exact)
                  ? 'text-primary-500'
                  : 'text-dark-400 hover:text-dark-200'
              )}
              onClick={() => setShowMenu(false)}
            >
              <Icon className={cn('w-6 h-6', isActive(path, exact) && 'text-primary-500')} />
              <span className="text-xs font-medium">{label}</span>
              {isActive(path, exact) && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary-500" />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
