import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Header, type HeaderProps } from './Header';
import { BottomNav } from './BottomNav';
import { cn } from '@/utils/cn';
import { LayoutContext, type LayoutContextValue } from './layoutState';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useUIStore } from '@/store';
import { BOTTOM_NAV_HEIGHT } from '@/config/breakpoints';

export interface LayoutProps extends HeaderProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showHeader?: boolean;
}

export function Layout({
  children,
  onLogout,
  userName = 'User',
  isAuthPage = false,
  className,
  contentClassName,
  showHeader = true,
}: LayoutProps) {
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);
  const isMobile = useIsMobile();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);

  const setSidebar = useCallback((content: ReactNode | null) => {
    setSidebarContent(content);
  }, []);

  const contextValue = useMemo<LayoutContextValue>(
    () => ({
      sidebar: sidebarContent,
      setSidebar,
    }),
    [setSidebar, sidebarContent],
  );

  // Handle menu button click from bottom nav
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  // Swipe from left edge to open sidebar on mobile
  useSwipeGesture({
    onSwipeRight: () => setSidebarOpen(true),
    enabled: isMobile && !sidebarOpen && !isAuthPage,
    edgeThreshold: 30,
  });

  // Show bottom nav on mobile for authenticated, non-auth pages
  const showBottomNav = isMobile && !isAuthPage;

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className={cn('flex h-screen flex-col', className)}>
        {showHeader && <Header onLogout={onLogout} userName={userName} isAuthPage={isAuthPage} />}

        <div className="flex min-h-0 flex-1">
          {sidebarContent ? (
            <div className="relative h-full flex-shrink-0">{sidebarContent}</div>
          ) : null}

          <main
            className={cn(
              'relative flex-1 overflow-auto bg-surface-secondary dark:bg-surface-dark',
              contentClassName,
            )}
            style={showBottomNav ? { paddingBottom: BOTTOM_NAV_HEIGHT } : undefined}
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        {showBottomNav && <BottomNav onMenuClick={handleMenuClick} />}
      </div>
    </LayoutContext.Provider>
  );
}
