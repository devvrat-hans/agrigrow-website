'use client';

import { useMemo, useState, useCallback } from 'react';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { NutrientDeficiency } from '@/types/crop-ai';
import { NutrientDeficiencyCard } from './NutrientDeficiencyCard';

// TYPES

export interface DeficienciesListProps {
  /** Array of nutrient deficiencies */
  deficiencies: NutrientDeficiency[];
  /** Custom empty message */
  emptyMessage?: string;
  /** Maximum items to show initially */
  initialLimit?: number;
  /** Additional CSS classes */
  className?: string;
}

// CONSTANTS

const DEFAULT_INITIAL_LIMIT = 2;

/**
 * DeficienciesList Component
 * 
 * Displays a list of nutrient deficiency cards.
 * Shows empty state when no deficiencies are detected.
 */
export function DeficienciesList({
  deficiencies,
  emptyMessage = 'No nutrient deficiencies detected',
  initialLimit = DEFAULT_INITIAL_LIMIT,
  className,
}: DeficienciesListProps) {
  // State for showing all deficiencies
  const [showAll, setShowAll] = useState(false);

  // Track which card is expanded
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Toggle show all
  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  // Handle card toggle
  const handleCardToggle = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  // Sort deficiencies by confidence (highest first)
  const sortedDeficiencies = useMemo(() => {
    return [...deficiencies].sort((a, b) => b.confidence - a.confidence);
  }, [deficiencies]);

  // Get visible deficiencies
  const visibleDeficiencies = useMemo(() => {
    if (showAll) {
      return sortedDeficiencies;
    }
    return sortedDeficiencies.slice(0, initialLimit);
  }, [sortedDeficiencies, showAll, initialLimit]);

  // Check if there are more to show
  const hasMore = deficiencies.length > initialLimit;
  const remainingCount = deficiencies.length - initialLimit;

  // Empty state
  if (deficiencies.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'py-6 sm:py-8 px-4',
          'bg-green-50 dark:bg-green-950/20',
          'border border-green-200 dark:border-green-800',
          'rounded-lg',
          className
        )}
      >
        {/* Success Icon */}
        <div
          className={cn(
            'flex items-center justify-center',
            'w-12 h-12 mb-3',
            'rounded-full',
            'bg-green-100 dark:bg-green-900/50'
          )}
        >
          <IconCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>

        {/* Message */}
        <p className="text-sm font-medium text-green-700 dark:text-green-300 text-center">
          {emptyMessage}
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
          Your crop appears to have healthy nutrient levels
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
          Nutrient Deficiencies ({deficiencies.length})
        </h3>
      </div>

      {/* Deficiency Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {visibleDeficiencies.map((deficiency, index) => (
          <NutrientDeficiencyCard
            key={`${deficiency.nutrient}-${index}`}
            deficiency={deficiency}
            expanded={expandedIndex === index}
            onToggle={() => handleCardToggle(index)}
          />
        ))}
      </div>

      {/* View All / View Less Button */}
      {hasMore && (
        <button
          type="button"
          onClick={toggleShowAll}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'mt-3 sm:mt-4',
            'py-2.5 px-4',
            'min-h-[44px]',
            'text-sm font-medium',
            'text-primary-600 dark:text-primary-400',
            'bg-primary-50 dark:bg-primary-950/30',
            'hover:bg-primary-100 dark:hover:bg-primary-900/40',
            'rounded-lg',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
          )}
        >
          {showAll ? (
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
    </div>
  );
}

export default DeficienciesList;
