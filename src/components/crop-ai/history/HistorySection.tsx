'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { AnalysisFilters } from '@/types/crop-ai';
import { HistoryFilters } from './HistoryFilters';
import { HistoryGrid } from './HistoryGrid';

// TYPES

export interface HistorySectionProps {
  /** Whether to show as full history view */
  fullView?: boolean;
  /** Limit for recent analyses preview */
  previewLimit?: number;
  /** Link to full history page */
  historyLink?: string;
  /** Callback when a card is clicked */
  onCardClick?: (analysisId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * HistorySection Component
 * 
 * Composes HistoryFilters and HistoryGrid with useAnalysisHistory hook.
 * Shows recent analyses with optional "View all" link or full history view.
 */
export function HistorySection({
  fullView = false,
  previewLimit = 3,
  historyLink = '/crop-ai/history',
  onCardClick,
  className,
  showFilters = true,
  emptyMessage,
}: HistorySectionProps) {
  const { t } = useTranslation();

  // Use analysis history hook with appropriate limit
  const {
    analyses,
    loading,
    hasMore,
    pagination,
    fetchHistory: _fetchHistory,
    fetchMore,
    setFilters,
    clearFilters: _clearFilters,
  } = useAnalysisHistory({
    limit: fullView ? 12 : previewLimit,
    autoFetch: true,
  });

  // Current filters state
  const [currentFilters, setCurrentFilters] = useState<AnalysisFilters>({});

  // Available crop types from analyses
  const availableCropTypes = useMemo(() => {
    const types = new Set(analyses.map((a) => a.cropType));
    return Array.from(types).sort();
  }, [analyses]);

  // Handle filter change
  const handleFilterChange = useCallback(
    (filters: AnalysisFilters) => {
      setCurrentFilters(filters);
      setFilters(filters);
    },
    [setFilters]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (analysisId: string) => {
      onCardClick?.(analysisId);
    },
    [onCardClick]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    fetchMore();
  }, [fetchMore]);

  // Displayed analyses (limited for preview mode)
  const displayedAnalyses = useMemo(() => {
    if (fullView) {
      return analyses;
    }
    return analyses.slice(0, previewLimit);
  }, [analyses, fullView, previewLimit]);

  // Check if more available in preview mode
  const hasMoreInPreview = !fullView && analyses.length > previewLimit;

  // Default empty message
  const defaultEmptyMessage = fullView
    ? t('cropAi.history.noMatchingFilters')
    : t('cropAi.history.noHistoryDesc');

  return (
    <section className={cn('space-y-3 sm:space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {fullView ? t('cropAi.history.title') : t('cropAi.history.title')}
        </h2>

        {/* View All Link (preview mode only) */}
        {!fullView && analyses.length > 0 && (
          <Link
            href={historyLink}
            className={cn(
              'min-h-[44px] inline-flex items-center gap-1',
              'text-sm font-medium',
              'text-primary-600 dark:text-primary-400',
              'hover:text-primary-700 dark:hover:text-primary-300',
              'transition-colors'
            )}
          >
            {t('cropAi.history.viewDetails')}
            <IconChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Filters (full view only) */}
      {fullView && showFilters && (
        <HistoryFilters
          filters={currentFilters}
          onChange={handleFilterChange}
          cropTypes={availableCropTypes}
        />
      )}

      {/* Analysis Count (full view) */}
      {fullView && pagination.totalCount > 0 && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {t('cropAi.history.title')} — {analyses.length} / {pagination.totalCount}
        </p>
      )}

      {/* History Grid */}
      <HistoryGrid
        analyses={displayedAnalyses}
        loading={loading}
        hasMore={fullView ? hasMore : false}
        onLoadMore={fullView ? handleLoadMore : undefined}
        onCardClick={handleCardClick}
        emptyMessage={emptyMessage || defaultEmptyMessage}
        useInfiniteScroll={fullView}
        className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      />

      {/* "See More" Button for Preview */}
      {hasMoreInPreview && (
        <div className="flex justify-center pt-2">
          <Link
            href={historyLink}
            className={cn(
              'min-h-[44px] inline-flex items-center justify-center gap-2',
              'px-4 py-2',
              'text-sm font-medium',
              'text-primary-600 dark:text-primary-400',
              'bg-primary-50 dark:bg-primary-950/30',
              'hover:bg-primary-100 dark:hover:bg-primary-900/40',
              'rounded-lg',
              'transition-colors'
            )}
          >
            See All {pagination.totalCount > 0 ? `(${pagination.totalCount})` : ''} Analyses
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default HistorySection;
