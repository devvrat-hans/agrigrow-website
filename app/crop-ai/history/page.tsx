'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconHistory, IconFilter } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import {
  HistoryGrid,
  HistoryFilters,
  AnalysisDetailModal,
} from '@/components/crop-ai/history';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import type { AnalysisFilters } from '@/types/crop-ai';

export default function CropAIHistoryPage() {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentFilters, setCurrentFilters] = useState<AnalysisFilters>({});

  // Check authentication
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      router.push('/auth/signin');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Use analysis history hook
  const {
    analyses,
    loading,
    refreshing,
    error,
    hasMore,
    fetchMore,
    refresh,
    setFilters,
    clearFilters,
  } = useAnalysisHistory({
    limit: 20,
    autoFetch: isAuthenticated === true,
  });

  // Handle card click - open detail modal
  const handleCardClick = useCallback((analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setIsModalOpen(true);
  }, []);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAnalysisId(null);
  }, []);

  // Handle analysis deleted
  const handleDeleted = useCallback(() => {
    handleCloseModal();
    refresh();
  }, [handleCloseModal, refresh]);

  // Handle filter change
  const handleFilterChange = useCallback((filters: AnalysisFilters) => {
    setCurrentFilters(filters);
    setFilters(filters);
    setShowFilters(false);
  }, [setFilters]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setCurrentFilters({});
    clearFilters();
    setShowFilters(false);
  }, [clearFilters]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/crop-ai');
  }, [router]);

  // Header right action
  const headerRightAction = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowFilters(!showFilters)}
      className={cn(showFilters && 'bg-gray-100 dark:bg-gray-800')}
    >
      <IconFilter className="w-4 h-4" />
      <span className="sr-only sm:not-sr-only sm:ml-2">Filter</span>
    </Button>
  );

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <PageHeader
        showBackButton
        onBack={handleBack}
        title="Analysis History"
        rightAction={headerRightAction}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 py-4 sm:px-4 sm:py-6 pb-24 md:pb-8">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/30">
              <IconHistory className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Analysis History
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View all your past crop diagnoses and planning recommendations.
          </p>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <HistoryFilters
              filters={currentFilters}
              onChange={handleFilterChange}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2 text-gray-500"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="mt-2 text-red-600 hover:text-red-700"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Pull to Refresh Indicator */}
        {refreshing && (
          <div className="flex items-center justify-center py-4 mb-4">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Refreshing...</span>
          </div>
        )}

        {/* Initial Loading State */}
        {loading && analyses.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading your history...
            </p>
          </div>
        ) : analyses.length === 0 && !loading ? (
          /* Empty State */
          <EmptyState
            icon={<IconHistory className="w-12 h-12 text-gray-400" />}
            message="No Analysis History"
            description="You haven't analyzed any crops yet. Start by uploading a crop image or getting crop recommendations."
            action={
              <Button onClick={() => router.push('/crop-ai')}>
                Start Analysis
              </Button>
            }
          />
        ) : (
          /* History Grid */
          <HistoryGrid
            analyses={analyses}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={fetchMore}
            onCardClick={handleCardClick}
            selectedId={selectedAnalysisId || undefined}
            useInfiniteScroll
            emptyMessage="No analyses match your filters"
          />
        )}
      </main>

      {/* Analysis Detail Modal */}
      <AnalysisDetailModal
        analysisId={selectedAnalysisId}
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        onDeleted={handleDeleted}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
