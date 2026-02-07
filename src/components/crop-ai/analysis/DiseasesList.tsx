'use client';

import { useState, useMemo } from 'react';
import { IconShieldCheck, IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DiseaseCard } from './DiseaseCard';
import { DiseaseDetection, DiseaseSeverity } from '@/types/crop-ai';

// TYPES

export interface DiseasesListProps {
  /** Array of detected diseases */
  diseases: DiseaseDetection[];
  /** Message to show when no diseases are detected */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Initial number of items to show */
  initialDisplayCount?: number;
}

// Severity priority for sorting (higher = more severe)
const SEVERITY_PRIORITY: Record<DiseaseSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * DiseasesList Component
 * 
 * Displays a list of detected diseases sorted by severity.
 * Shows empty state with checkmark if no diseases are detected.
 * Limits initial display with "View all" button.
 * 
 * @example
 * <DiseasesList 
 *   diseases={analysisResult.diseases} 
 *   emptyMessage="No diseases detected" 
 * />
 */
export function DiseasesList({
  diseases,
  emptyMessage = 'No diseases detected. Your crop looks healthy!',
  className,
  initialDisplayCount = 2,
}: DiseasesListProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Sort diseases by severity (high first)
  const sortedDiseases = useMemo(() => {
    return [...diseases].sort((a, b) => {
      return SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
    });
  }, [diseases]);

  // Determine which diseases to display
  const displayedDiseases = useMemo(() => {
    if (showAll) return sortedDiseases;
    return sortedDiseases.slice(0, initialDisplayCount);
  }, [sortedDiseases, showAll, initialDisplayCount]);

  // Check if there are more diseases to show
  const hasMore = sortedDiseases.length > initialDisplayCount;
  const remainingCount = sortedDiseases.length - initialDisplayCount;

  // Handle card expansion
  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  // Empty state
  if (diseases.length === 0) {
    return (
      <div className={cn('text-center py-6 sm:py-8', className)}>
        <div
          className={cn(
            'inline-flex items-center justify-center',
            'w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4',
            'bg-green-100 dark:bg-green-900/30',
            'rounded-full'
          )}
        >
          <IconShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
        </div>
        <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
          All Clear!
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Disease Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {displayedDiseases.map((disease, index) => (
          <DiseaseCard
            key={`${disease.name}-${index}`}
            disease={disease}
            expanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>

      {/* View All Button */}
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full mt-3 sm:mt-4 min-h-[44px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <IconChevronDown className="w-4 h-4 mr-1" />
          View {remainingCount} more {remainingCount === 1 ? 'issue' : 'issues'}
        </Button>
      )}

      {/* Collapse Button */}
      {showAll && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowAll(false);
            setExpandedIndex(null);
          }}
          className="w-full mt-3 sm:mt-4 min-h-[44px] text-gray-500 dark:text-gray-400"
        >
          Show less
        </Button>
      )}
    </div>
  );
}

export default DiseasesList;
