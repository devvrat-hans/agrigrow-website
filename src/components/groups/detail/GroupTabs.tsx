'use client';

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconMessageCircle,
  IconInfoCircle,
  IconUsers,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Tab configuration type
 */
interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

/**
 * GroupTabs component props
 */
interface GroupTabsProps {
  /** Number of posts in the group */
  postCount?: number;
  /** Number of members in the group */
  memberCount?: number;
  /** Active tab override (if managing state externally) */
  activeTab?: string;
  /** Callback when tab changes (if managing state externally) */
  onTabChange?: (tabId: string) => void;
  /** Whether to use URL params for tab state */
  useUrlParams?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format number with abbreviation for display
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * GroupTabs component
 * 
 * Tab navigation for group sections with count badges.
 * 
 * Features:
 * - Posts tab (default) with post count badge
 * - About tab for group information
 * - Members tab with member count badge
 * - URL params or state for active tab
 * - Mobile-friendly with horizontal scroll
 * - Keyboard accessible
 * - Underline indicator for active tab
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupTabs({
  postCount = 0,
  memberCount = 0,
  activeTab: controlledActiveTab,
  onTabChange,
  useUrlParams = true,
  className,
}: GroupTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get active tab from URL or controlled prop
  const urlTab = searchParams.get('tab');
  const activeTab = controlledActiveTab ?? urlTab ?? 'posts';

  // Tab configuration
  const tabs: TabConfig[] = [
    {
      id: 'posts',
      label: 'Posts',
      icon: <IconMessageCircle className="w-4 h-4" />,
      count: postCount,
    },
    {
      id: 'about',
      label: 'About',
      icon: <IconInfoCircle className="w-4 h-4" />,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <IconUsers className="w-4 h-4" />,
      count: memberCount,
    },
  ];

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }

    if (useUrlParams) {
      // Update URL params
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === 'posts') {
        params.delete('tab'); // Default tab, no need for param
      } else {
        params.set('tab', tabId);
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    }
  };

  return (
    <nav
      className={cn(
        'border-b border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-900',
        'sticky top-0 z-40 sm:relative sm:z-auto',
        className
      )}
      role="tablist"
      aria-label="Group sections"
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Horizontal scroll container for mobile */}
        <div className="flex overflow-x-auto scrollbar-hide -mb-px snap-x snap-mandatory">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3',
                  'min-h-[44px]',
                  'text-sm sm:text-base font-medium whitespace-nowrap',
                  'border-b-2 transition-colors duration-200',
                  'snap-start',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  'active:bg-muted/50',
                  isActive
                    ? 'border-primary-600 dark:border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className={cn(
                      'ml-0.5 sm:ml-1 px-1.5 py-0.5 text-xs min-w-[20px] justify-center',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {formatCount(tab.count)}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default GroupTabs;
