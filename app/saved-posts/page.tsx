'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { IconBookmark } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { FeedItemCard } from '@/components/feed/FeedItemCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useSavedPosts } from '@/hooks/useSavedPosts';

/**
 * Saved Posts Page
 * Displays user's saved/bookmarked posts with ability to unsave
 */
export default function SavedPostsPage() {
  const {
    savedPosts,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    loadMore,
    toggleSave,
    isPostSaved,
  } = useSavedPosts();

  /**
   * Handle unsave action
   */
  const handleUnsave = useCallback(async (postId: string) => {
    return await toggleSave(postId);
  }, [toggleSave]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <PageHeader
        showBackButton
        title="Saved Posts"
        rightAction={
          pagination.total > 0 ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total} saved
            </span>
          ) : undefined
        }
      />

      {/* Content */}
      <main className="max-w-2xl mx-auto">
        {/* Loading state */}
        {isLoading && savedPosts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" text="Loading saved posts..." />
          </div>
        ) : error ? (
          /* Error state */
          <div className="px-4 py-16">
            <EmptyState
              icon={<IconBookmark size={48} className="text-gray-400" />}
              message="Failed to load saved posts"
              description={error.message}
            />
          </div>
        ) : savedPosts.length === 0 ? (
          /* Empty state */
          <div className="px-4 py-16">
            <EmptyState
              icon={<IconBookmark size={48} className="text-gray-400" />}
              message="No saved posts yet"
              description="Posts you save will appear here for easy access later."
              action={
                <Link href="/home">
                  <Button variant="outline" className="mt-4">
                    Explore Feed
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          /* Posts list */
          <div className="py-4 space-y-4">
            {savedPosts.map((post) => (
              <div key={post._id || post.id} className="px-4">
                <FeedItemCard
                  item={post}
                  onSave={handleUnsave}
                  isPostSaved={isPostSaved}
                />
              </div>
            ))}

            {/* Load more */}
            {pagination.hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Loading...</span>
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}

            {/* End of list */}
            {!pagination.hasMore && savedPosts.length > 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                You've reached the end of your saved posts
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
