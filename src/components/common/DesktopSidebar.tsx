'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconHome,
  IconPlant2,
  IconBook,
  IconUsersGroup,
  IconUser,
  IconBookmark,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { useTranslation } from '@/hooks/useTranslation';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/home', labelKey: 'nav.feed', icon: IconHome },
  { href: '/crop-ai', labelKey: 'nav.cropAi', icon: IconPlant2 },
  { href: '/knowledge', labelKey: 'nav.learn', icon: IconBook },
  { href: '/communities', labelKey: 'nav.communities', icon: IconUsersGroup },
  { href: '/saved-posts', labelKey: 'nav.saved', icon: IconBookmark },
  { href: '/profile', labelKey: 'nav.profile', icon: IconUser },
];

/**
 * Desktop Sidebar Navigation Component
 * Hidden on mobile, visible on md screens and above
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  /**
   * Check if a route is active
   * Handles both exact matches and nested routes
   */
  const isRouteActive = (href: string): boolean => {
    if (pathname === href) return true;
    // Handle nested routes (e.g., /communities/group-id should highlight Communities)
    if (pathname.startsWith(`${href}/`)) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col',
        'fixed left-0 top-0 bottom-0',
        'w-64 bg-background border-r border-border',
        'z-40'
      )}
    >
      {/* Logo/Brand Section */}
      <div className="p-4 border-b border-border">
        <Link href="/home" className="block">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'transition-colors duration-200',
                    'text-sm font-medium',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    size={20}
                    className={cn(
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer/Version */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {t('desktop.agrigrowVersion')}
        </p>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
