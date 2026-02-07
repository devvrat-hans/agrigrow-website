'use client';

import React, { useRef, useEffect, useState } from 'react';
import { 
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { GroupType } from '@/types/group';

/**
 * Category tab type - includes 'all' option
 */
type CategoryType = 'all' | GroupType;

/**
 * GroupCategoryTabs component props
 */
interface GroupCategoryTabsProps {
  /** Currently selected category */
  selectedCategory: CategoryType;
  /** Callback when category is selected */
  onSelectCategory: (category: CategoryType) => void;
  /** Optional counts for each category */
  counts?: Partial<Record<CategoryType, number>>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Category configuration with label and color
 */
interface CategoryConfig {
  label: string;
  color: string;
  activeColor: string;
}

/**
 * Category configurations
 */
const categoryConfig: Record<CategoryType, CategoryConfig> = {
  all: {
    label: 'All',
    color: 'text-gray-600 dark:text-gray-400',
    activeColor: 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900',
  },
  crop: {
    label: 'Crop-based',
    color: 'text-emerald-600 dark:text-emerald-400',
    activeColor: 'bg-emerald-600 text-white',
  },
  region: {
    label: 'Regional',
    color: 'text-blue-600 dark:text-blue-400',
    activeColor: 'bg-blue-600 text-white',
  },
  topic: {
    label: 'Topic',
    color: 'text-purple-600 dark:text-purple-400',
    activeColor: 'bg-purple-600 text-white',
  },
  practice: {
    label: 'Practice',
    color: 'text-amber-600 dark:text-amber-400',
    activeColor: 'bg-amber-600 text-white',
  },
};

/**
 * Category order for display
 */
const categoryOrder: CategoryType[] = ['all', 'crop', 'region', 'topic', 'practice'];

/**
 * GroupCategoryTabs component
 * 
 * Horizontal scrollable tabs for filtering groups by type.
 * Includes All, Crop-based, Regional, Topic, and Practice categories.
 * 
 * Features:
 * - Horizontal scroll on mobile
 * - Category icons with colors
 * - Active state styling
 * - Optional count badges
 * - Scroll indicators on desktop
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupCategoryTabs({
  selectedCategory,
  onSelectCategory,
  counts,
  className,
}: GroupCategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }
  };

  // Initialize and listen for scroll
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Scroll handlers
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 z-10',
            'w-8 h-8 rounded-full',
            'bg-white dark:bg-gray-900 shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'flex items-center justify-center',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 dark:hover:bg-gray-800',
            'transition-colors duration-200',
            'hidden sm:flex'
          )}
          aria-label="Scroll left"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory',
          'px-1 py-1',
          '-mx-1',
          'scroll-smooth',
          canScrollLeft && 'sm:pl-10',
          canScrollRight && 'sm:pr-10'
        )}
        role="tablist"
        aria-label="Filter groups by category"
      >
        {categoryOrder.map((category) => {
          const config = categoryConfig[category];
          const isActive = selectedCategory === category;
          const count = counts?.[category];

          return (
            <button
              key={category}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${category}-groups`}
              onClick={() => onSelectCategory(category)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full snap-start',
                'font-medium text-xs sm:text-sm whitespace-nowrap',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'min-h-[44px]',
                'active:scale-[0.95]',
                isActive
                  ? config.activeColor
                  : cn(
                      'bg-gray-100 dark:bg-gray-800',
                      config.color,
                      'hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
              )}
            >
              <span>{config.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right scroll indicator */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 z-10',
            'w-8 h-8 rounded-full',
            'bg-white dark:bg-gray-900 shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'flex items-center justify-center',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-50 dark:hover:bg-gray-800',
            'transition-colors duration-200',
            'hidden sm:flex'
          )}
          aria-label="Scroll right"
        >
          <IconChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default GroupCategoryTabs;
