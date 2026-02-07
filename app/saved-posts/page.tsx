'use client';

import React, { useCallback } from 'react';
import { IconBookmark, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
// cn utility imported for potential future use
// import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FeedItemCard } from '@/components/feed/FeedItemCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
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
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <IconArrowLeft size={20} />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <IconBookmark size={20} className="text-primary-600 dark:text-primary-400" />
              <h1 className="text-lg font-semibold">Saved Posts</h1>
            </div>
            {pagination.total > 0 && (
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                {pagination.total} saved
              </span>
            )}
          </div>
        </div>
      </header>

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
