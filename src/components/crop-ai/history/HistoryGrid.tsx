'use client';

import { useCallback, useEffect, useRef } from 'react';
import { IconHistory, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisHistoryItem } from '@/types/crop-ai';
import { HistoryCard } from './HistoryCard';

// TYPES

export interface HistoryGridProps {
  /** Array of analysis history items */
  analyses: AnalysisHistoryItem[];
  /** Whether data is loading */
  loading?: boolean;
  /** Whether there is more data to load */
  hasMore?: boolean;
  /** Callback to load more data */
  onLoadMore?: () => void;
  /** Callback when a card is clicked */
  onCardClick?: (analysisId: string) => void;
  /** Selected analysis ID */
  selectedId?: string;
  /** Additional CSS classes */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Use infinite scroll instead of button */
  useInfiniteScroll?: boolean;
}

// SKELETON COMPONENT

function HistoryCardSkeleton() {
  return (
    <Card className="p-3 animate-pulse">
      <div className="flex gap-3">
        {/* Thumbnail Skeleton */}
        <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

        {/* Info Skeleton */}
        <div className="flex-1 min-w-0">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
          <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

// LOADING GRID

function LoadingGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <HistoryCardSkeleton key={index} />
      ))}
    </div>
  );
}

// EMPTY STATE

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className={cn(
          'flex items-center justify-center',
          'w-16 h-16 mb-4',
          'rounded-full',
          'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <IconHistory className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
        {t('cropAi.history.noAnalysisHistory')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        {message}
      </p>
    </div>
  );
}

/**
 * HistoryGrid Component
 * 
 * Grid layout of HistoryCards with loading states and pagination.
 * Supports infinite scroll or "Load more" button.
 */
export function HistoryGrid({
  analyses,
  loading = false,
  hasMore = false,
  onLoadMore,
  onCardClick,
  selectedId,
  className,
  emptyMessage,
  useInfiniteScroll = false,
}: HistoryGridProps) {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle card click
  const handleCardClick = useCallback(
    (analysisId: string) => {
      onCardClick?.(analysisId);
    },
    [onCardClick]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loading, hasMore, onLoadMore]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!useInfiniteScroll || !loadMoreRef.current || !hasMore || loading) {
      return;
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore?.();
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [useInfiniteScroll, hasMore, loading, onLoadMore]);

  // Initial loading state
  if (loading && analyses.length === 0) {
    return <LoadingGrid count={6} />;
  }

  // Empty state
  if (!loading && analyses.length === 0) {
    return <EmptyState message={emptyMessage ?? ''} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {analyses.map((analysis) => (
          <HistoryCard
            key={analysis.id}
            analysis={analysis}
            onClick={() => handleCardClick(analysis.id)}
            isSelected={selectedId === analysis.id}
          />
        ))}
      </div>

      {/* Load More / Infinite Scroll Trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4"
        >
          {useInfiniteScroll ? (
            // Infinite scroll loading indicator
            loading && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <IconLoader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{t('cropAi.history.loadingHistory')}</span>
              </div>
            )
          ) : (
            // Load more button
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading}
              className="min-w-[140px]"
            >
              {loading ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('cropAi.history.loadingHistory')}
                </>
              ) : (
                t('cropAi.chat.loadMore')
              )}
            </Button>
          )}
        </div>
      )}

      {/* Loading more indicator at bottom */}
      {loading && analyses.length > 0 && !useInfiniteScroll && (
        <div className="flex items-center justify-center py-4">
          <IconLoader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}

export default HistoryGrid;
