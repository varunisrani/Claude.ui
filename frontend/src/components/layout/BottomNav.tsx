import { MessagesSquare, Code, SquareTerminal, Settings, Menu, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/store';
import { cn } from '@/utils/cn';
import type { ViewType } from '@/types/ui.types';
import { BOTTOM_NAV_HEIGHT } from '@/config/breakpoints';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  icon: typeof MessagesSquare;
  label: string;
  view?: ViewType;
  path?: string;
}

const navItems: NavItem[] = [
  { id: 'chat', icon: MessagesSquare, label: 'Chat', view: 'agent' },
  { id: 'editor', icon: Code, label: 'Editor', view: 'editor' },
  { id: 'terminal', icon: SquareTerminal, label: 'Terminal', view: 'terminal' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
];

interface BottomNavProps {
  onMenuClick?: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const currentView = useUIStore((state) => state.currentView);
  const setCurrentView = useUIStore((state) => state.setCurrentView);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const navigate = useNavigate();
  const location = useLocation();

  const isSettingsPage = location.pathname === '/settings';
  const isDark = theme === 'dark';

  const handleNavClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.view) {
      // If we're on settings page, navigate back to chat first
      if (isSettingsPage) {
        navigate('/');
      }
      setCurrentView(item.view);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    return !isSettingsPage && item.view === currentView;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface pb-safe dark:border-border-dark dark:bg-surface-dark md:hidden"
      style={{ height: BOTTOM_NAV_HEIGHT }}
    >
      <div className="flex h-full items-center justify-around px-2">
        {/* Menu button for sidebar */}
        <button
          onClick={onMenuClick}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
            'text-text-tertiary transition-colors dark:text-text-dark-tertiary',
            'active:bg-surface-hover dark:active:bg-surface-dark-hover',
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>

        {/* Nav items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
                'transition-colors',
                active
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-text-tertiary dark:text-text-dark-tertiary',
                'active:bg-surface-hover dark:active:bg-surface-dark-hover',
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={cn('text-[10px]', active ? 'font-semibold' : 'font-medium')}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
            'text-text-tertiary transition-colors dark:text-text-dark-tertiary',
            'active:bg-surface-hover dark:active:bg-surface-dark-hover',
          )}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? (
            <Sun className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Moon className="h-5 w-5" strokeWidth={2} />
          )}
          <span className="text-[10px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
}
