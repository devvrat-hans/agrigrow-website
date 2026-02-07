'use client';

import { useState, useCallback, useMemo } from 'react';
import { IconPlant2, IconCheck, IconChevronDown, IconChevronUp, IconSparkles } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

// TYPES

export interface YieldSuggestion {
  id: string;
  text: string;
  category?: string;
}

export interface YieldSuggestionsProps {
  /** Array of suggestions */
  suggestions: string[];
  /** Crop type for context */
  cropType?: string;
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state */
  defaultExpanded?: boolean;
  /** Maximum suggestions to show initially */
  initialLimit?: number;
}

// SUGGESTION CATEGORIES

interface SuggestionCategory {
  label: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    label: 'Watering',
    keywords: ['water', 'irrigation', 'moisture', 'drought', 'dry'],
    icon: IconPlant2,
    color: 'text-blue-500',
  },
  {
    label: 'Fertilizer',
    keywords: ['fertilizer', 'nutrient', 'nitrogen', 'phosphorus', 'potassium', 'manure', 'compost'],
    icon: IconPlant2,
    color: 'text-green-500',
  },
  {
    label: 'Pest Control',
    keywords: ['pest', 'insect', 'spray', 'pesticide', 'control', 'protection'],
    icon: IconPlant2,
    color: 'text-red-500',
  },
  {
    label: 'General Care',
    keywords: [],
    icon: IconSparkles,
    color: 'text-primary-500',
  },
];

// HELPER FUNCTIONS

function categorizeSuggestion(suggestion: string): string {
  const lowerSuggestion = suggestion.toLowerCase();
  
  for (const category of SUGGESTION_CATEGORIES) {
    if (category.keywords.some((keyword) => lowerSuggestion.includes(keyword))) {
      return category.label;
    }
  }
  
  return 'General Care';
}

function groupSuggestionsByCategory(suggestions: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  
  suggestions.forEach((suggestion) => {
    const category = categorizeSuggestion(suggestion);
    const existing = grouped.get(category) || [];
    grouped.set(category, [...existing, suggestion]);
  });
  
  return grouped;
}

/**
 * YieldSuggestions Component
 * 
 * Card with actionable suggestions for improving crop yield.
 * Each suggestion can be marked as done (local state only).
 */
export function YieldSuggestions({
  suggestions,
  cropType,
  className,
  defaultExpanded = false,
  initialLimit = 5,
}: YieldSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleCompleted = useCallback((index: number) => {
    setCompletedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Group suggestions by category if many
  const groupedSuggestions = useMemo(() => {
    if (suggestions.length > 6) {
      return groupSuggestionsByCategory(suggestions);
    }
    return null;
  }, [suggestions]);

  // Get visible suggestions
  const visibleSuggestions = useMemo(() => {
    if (isExpanded) {
      return suggestions;
    }
    return suggestions.slice(0, initialLimit);
  }, [suggestions, isExpanded, initialLimit]);

  // Check if there are more to show
  const hasMore = suggestions.length > initialLimit;
  const remainingCount = suggestions.length - initialLimit;

  // Calculate completion progress
  const completedCount = completedItems.size;
  const totalCount = suggestions.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 sm:w-10 sm:h-10 rounded-lg',
                'bg-primary-50 dark:bg-primary-950/30'
              )}
            >
              <IconSparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Yield Improvement Tips
              </h3>
              {cropType && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  For {cropType}
                </p>
              )}
            </div>
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{totalCount}
              </div>
              <div className="w-12 sm:w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-3 sm:p-4">
        {/* Simple List (few suggestions) */}
        {!groupedSuggestions && (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleSuggestions.map((suggestion, index) => {
              const isCompleted = completedItems.has(index);

              return (
                <li key={index} className="py-2 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggleCompleted(index)}
                    className={cn(
                      'w-full flex items-start gap-3',
                      'p-2.5 sm:p-3 rounded-lg',
                      'text-left',
                      'min-h-[44px]',
                      'transition-all duration-150',
                      isCompleted
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                      'active:scale-[0.99]'
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'flex items-center justify-center flex-shrink-0',
                        'w-5 h-5 rounded-md mt-0.5',
                        'border-2 transition-colors duration-150',
                        isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    >
                      {isCompleted && (
                        <IconCheck className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Suggestion Text */}
                    <span
                      className={cn(
                        'text-sm',
                        isCompleted
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {suggestion}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Grouped List (many suggestions) */}
        {groupedSuggestions && (
          <div className="space-y-4 sm:space-y-6">
            {Array.from(groupedSuggestions.entries()).map(
              ([category, categorySuggestions], categoryIndex) => (
                <div key={category}>
                  {/* Category Header */}
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {category}
                  </h4>

                  {/* Category Suggestions */}
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categorySuggestions.map((suggestion, index) => {
                      const globalIndex = suggestions.indexOf(suggestion);
                      const isCompleted = completedItems.has(globalIndex);

                      // Skip if not in visible range when not expanded
                      if (!isExpanded && globalIndex >= initialLimit) {
                        return null;
                      }

                      return (
                        <li key={`${categoryIndex}-${index}`} className="py-2 first:pt-0 last:pb-0">
                          <button
                            type="button"
                            onClick={() => toggleCompleted(globalIndex)}
                            className={cn(
                              'w-full flex items-start gap-3',
                              'p-2 sm:p-2.5 rounded-lg',
                              'text-left',
                              'min-h-[44px]',
                              'transition-all duration-150',
                              isCompleted
                                ? 'bg-green-50 dark:bg-green-950/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                              'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                              'active:scale-[0.99]'
                            )}
                          >
                            {/* Checkbox */}
                            <div
                              className={cn(
                                'flex items-center justify-center flex-shrink-0',
                                'w-5 h-5 rounded-md mt-0.5',
                                'border-2 transition-colors duration-150',
                                isCompleted
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              )}
                            >
                              {isCompleted && (
                                <IconCheck className="w-3 h-3 text-white" />
                              )}
                            </div>

                            {/* Suggestion Text */}
                            <span
                              className={cn(
                                'text-sm',
                                isCompleted
                                  ? 'text-gray-500 dark:text-gray-400 line-through'
                                  : 'text-gray-700 dark:text-gray-300'
                              )}
                            >
                              {suggestion}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* View All / View Less Button */}
      {hasMore && (
        <button
          type="button"
          onClick={toggleExpanded}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'py-2.5 sm:py-3 px-4',
            'min-h-[44px]',
            'text-sm font-medium',
            'text-gray-600 dark:text-gray-400',
            'bg-gray-50 dark:bg-gray-800/30',
            'hover:bg-gray-100 dark:hover:bg-gray-700/30',
            'border-t border-gray-200 dark:border-gray-700',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20',
            'active:bg-gray-200 dark:active:bg-gray-600/30'
          )}
        >
          {isExpanded ? (
            <>
              <IconChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <IconChevronDown className="w-4 h-4" />
              View All ({remainingCount} more)
            </>
          )}
        </button>
      )}
    </Card>
  );
}

export default YieldSuggestions;
