'use client';

import { cn } from '@/lib/utils';

interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ElementType;
}

interface AnalysisTabsProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently active tab id */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabId: string) => void;
  /** Additional class names */
  className?: string;
}

/**
 * AnalysisTabs Component
 *
 * Horizontal scrolling tabs for analysis detail sections.
 * Touch-friendly with snap scrolling on mobile.
 *
 * @example
 * <AnalysisTabs
 *   tabs={[
 *     { id: 'diseases', label: 'Diseases', icon: IconVirus },
 *     { id: 'pests', label: 'Pests', icon: IconBug },
 *   ]}
 *   activeTab="diseases"
 *   onTabChange={(id) => setActiveTab(id)}
 * />
 */
export function AnalysisTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: AnalysisTabsProps) {
  return (
    <div
      className={cn(
        'flex overflow-x-auto',
        'snap-x snap-mandatory',
        'scrollbar-none',
        '-mx-3 sm:-mx-4 px-3 sm:px-4',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center justify-center gap-2',
              'min-h-[44px] px-4 py-2',
              'snap-start flex-shrink-0',
              'text-sm font-medium whitespace-nowrap',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              // Active state
              isActive && [
                'text-primary-600 dark:text-primary-400',
                'border-b-2 border-primary-600 dark:border-primary-400',
                '-mb-px',
              ],
              // Inactive state
              !isActive && [
                'text-gray-500 dark:text-gray-400',
                'hover:text-gray-700 dark:hover:text-gray-300',
              ]
            )}
            aria-selected={isActive}
            role="tab"
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
