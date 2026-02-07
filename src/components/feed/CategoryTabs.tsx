'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  IconList,
  IconQuestionMark,
  IconBulb,
  IconMessage,
  IconAlertTriangle,
  IconTrophy,
  IconUsers,
  IconFlame,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MobileScrollContainer } from '@/components/common';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Category item configuration
 */
export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ElementType;
  postType?: string;
  newCount?: number;
}

/**
 * Default categories for the feed (untranslated fallback)
 */
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'All', icon: IconList, postType: undefined },
  { id: 'questions', label: 'Questions', icon: IconQuestionMark, postType: 'question' },
  { id: 'tips', label: 'Tips', icon: IconBulb, postType: 'tip' },
  { id: 'updates', label: 'Updates', icon: IconMessage, postType: 'update' },
  { id: 'problems', label: 'Problems', icon: IconAlertTriangle, postType: 'problem' },
  { id: 'success', label: 'Success Stories', icon: IconTrophy, postType: 'success_story' },
  { id: 'following', label: 'Following', icon: IconUsers, postType: undefined },
  { id: 'trending', label: 'Trending', icon: IconFlame, postType: undefined },
];

/**
 * Hook to get translated default categories
 */
export function useTranslatedCategories(): CategoryItem[] {
  const { t } = useTranslation();
  return [
    { id: 'all', label: t('feed.categories.all'), icon: IconList, postType: undefined },
    { id: 'questions', label: t('feed.categories.questions'), icon: IconQuestionMark, postType: 'question' },
    { id: 'tips', label: t('feed.categories.tips'), icon: IconBulb, postType: 'tip' },
    { id: 'updates', label: t('feed.categories.updates'), icon: IconMessage, postType: 'update' },
    { id: 'problems', label: t('feed.categories.problems'), icon: IconAlertTriangle, postType: 'problem' },
    { id: 'success', label: t('feed.categories.successStories'), icon: IconTrophy, postType: 'success_story' },
    { id: 'following', label: t('feed.categories.following'), icon: IconUsers, postType: undefined },
    { id: 'trending', label: t('feed.categories.trending'), icon: IconFlame, postType: undefined },
  ];
}

/**
 * Props for CategoryTabs component
 */
interface CategoryTabsProps {
  /** Array of category items (uses defaults if not provided) */
  categories?: CategoryItem[];
  /** Initially selected category ID */
  initialTab?: string;
  /** Currently selected category ID (controlled mode) */
  selectedCategory?: string;
  /** Selection change handler */
  onTabChange?: (category: CategoryItem) => void;
  /** Legacy handler for backwards compatibility */
  onCategoryChange?: (categoryId: string) => void;
  /** New post counts by category ID */
  newPostCounts?: Record<string, number>;
  /** Whether trending has new posts */
  hasTrendingPosts?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CategoryTabs Component
 * Horizontally scrollable category tabs with keyboard navigation and new post indicators
 */
export function CategoryTabs({
  categories = DEFAULT_CATEGORIES,
  initialTab = 'all',
  selectedCategory: controlledSelected,
  onTabChange,
  onCategoryChange,
  newPostCounts = {},
  hasTrendingPosts = false,
  className,
}: CategoryTabsProps) {
  // State for uncontrolled mode
  const [internalSelected, setInternalSelected] = useState(initialTab);
  
  // Use controlled value if provided, otherwise internal state
  const selectedCategory = controlledSelected ?? internalSelected;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [focusedIndex, setFocusedIndex] = useState(-1);

  /**
   * Merge new post counts with categories
   */
  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    newCount: newPostCounts[cat.id] ?? cat.newCount,
  }));

  /**
   * Scroll tab into view
   */
  const scrollTabIntoView = useCallback((tabId: string) => {
    const tab = tabRefs.current.get(tabId);
    const container = containerRef.current;
    
    if (tab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      
      if (tabRect.left < containerRect.left) {
        // Tab is to the left, scroll left
        container.scrollBy({
          left: tabRect.left - containerRect.left - 16,
          behavior: 'smooth',
        });
      } else if (tabRect.right > containerRect.right) {
        // Tab is to the right, scroll right
        container.scrollBy({
          left: tabRect.right - containerRect.right + 16,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  /**
   * Handle tab selection
   */
  const handleTabSelect = useCallback((category: CategoryItem) => {
    if (!controlledSelected) {
      setInternalSelected(category.id);
    }
    onTabChange?.(category);
    onCategoryChange?.(category.id);
    scrollTabIntoView(category.id);
  }, [controlledSelected, onTabChange, onCategoryChange, scrollTabIntoView]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = (index + 1) % categoriesWithCounts.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = (index - 1 + categoriesWithCounts.length) % categoriesWithCounts.length;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = categoriesWithCounts.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleTabSelect(categoriesWithCounts[index]);
          return;
        default:
          return;
      }

      // Focus the new tab
      const newCategory = categoriesWithCounts[newIndex];
      const newTab = tabRefs.current.get(newCategory.id);
      if (newTab) {
        newTab.focus();
        setFocusedIndex(newIndex);
        scrollTabIntoView(newCategory.id);
      }
    },
    [categoriesWithCounts, handleTabSelect, scrollTabIntoView]
  );

  /**
   * Scroll selected tab into view on mount and selection change
   */
  useEffect(() => {
    scrollTabIntoView(selectedCategory);
  }, [selectedCategory, scrollTabIntoView]);

  return (
    <div className={cn('relative border-b border-gray-200 dark:border-gray-800', className)}>
      {/* Scrollable container - using MobileScrollContainer for optimized mobile scrolling */}
      <MobileScrollContainer
        ref={containerRef}
        className={cn(
          'gap-1 sm:gap-2 p-3'
        )}
        enableSnap={false}
        role="tablist"
        aria-label="Feed categories"
      >
        {categoriesWithCounts.map((category, index) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          const isTrending = category.id === 'trending';
          const showTrendingPulse = isTrending && hasTrendingPosts && !isSelected;
          const hasNewPosts = (category.newCount ?? 0) > 0;

          return (
            <button
              key={category.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(category.id, el);
                }
              }}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${category.id}-panel`}
              tabIndex={isSelected || focusedIndex === index ? 0 : -1}
              onClick={() => handleTabSelect(category)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              className={cn(
                // Responsive padding and minimum touch target height (44px)
                'relative flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 min-h-[44px] rounded-full',
                'text-sm font-medium whitespace-nowrap',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {/* Trending pulse animation */}
              {showTrendingPulse && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                </span>
              )}

              {/* Hide icons on mobile, show on larger screens */}
              <Icon
                size={18}
                className={cn(
                  'hidden sm:block',
                  isTrending && showTrendingPulse && 'text-orange-500',
                  isTrending && isSelected && 'text-orange-300'
                )}
              />
              <span>{category.label}</span>

              {/* New posts count badge */}
              {hasNewPosts && !isSelected && (
                <Badge
                  className={cn(
                    'ml-1 h-5 min-w-5 px-1.5 text-[10px] font-bold',
                    'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  )}
                >
                  {category.newCount! > 99 ? '99+' : category.newCount}
                </Badge>
              )}
            </button>
          );
        })}
      </MobileScrollContainer>

      {/* Active indicator line */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5',
          'bg-gradient-to-r from-transparent via-primary-500 to-transparent',
          'opacity-0 transition-opacity duration-200'
        )}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export default CategoryTabs;
