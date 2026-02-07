'use client';

import { useMemo, useState, useCallback } from 'react';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { PestDetection, DiseaseSeverity } from '@/types/crop-ai';
import { PestCard } from './PestCard';

// TYPES

export interface PestsListProps {
  /** Array of pest detections */
  pests: PestDetection[];
  /** Custom empty message */
  emptyMessage?: string;
  /** Maximum items to show initially */
  initialLimit?: number;
  /** Additional CSS classes */
  className?: string;
}

// CONSTANTS

const DEFAULT_INITIAL_LIMIT = 2;

// Severity order for sorting (high first)
const DAMAGE_LEVEL_ORDER: Record<DiseaseSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * PestsList Component
 * 
 * Displays a list of pest detection cards.
 * Shows empty state when no pests are detected.
 */
export function PestsList({
  pests,
  emptyMessage = 'No pests detected',
  initialLimit = DEFAULT_INITIAL_LIMIT,
  className,
}: PestsListProps) {
  // State for showing all pests
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

  // Sort pests by damage level (high first), then by confidence
  const sortedPests = useMemo(() => {
    return [...pests].sort((a, b) => {
      const damageComparison =
        DAMAGE_LEVEL_ORDER[b.damageLevel] - DAMAGE_LEVEL_ORDER[a.damageLevel];
      if (damageComparison !== 0) {
        return damageComparison;
      }
      return b.confidence - a.confidence;
    });
  }, [pests]);

  // Get visible pests
  const visiblePests = useMemo(() => {
    if (showAll) {
      return sortedPests;
    }
    return sortedPests.slice(0, initialLimit);
  }, [sortedPests, showAll, initialLimit]);

  // Check if there are more to show
  const hasMore = pests.length > initialLimit;
  const remainingCount = pests.length - initialLimit;

  // Empty state
  if (pests.length === 0) {
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
          Your crop appears to be pest-free
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
          Pests Detected ({pests.length})
        </h3>
      </div>

      {/* Pest Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {visiblePests.map((pest, index) => (
          <PestCard
            key={`${pest.name}-${index}`}
            pest={pest}
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

export default PestsList;
