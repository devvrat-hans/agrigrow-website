'use client';

/**
 * UserList Component
 * 
 * Renders a list of users with infinite scroll support.
 * Uses intersection observer for automatic loading of more items.
 */

import { useCallback, useEffect, useRef } from 'react';
import { IconUsers } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { UserListItem } from './UserListItem';
import { UserListItemSkeleton } from './UserListItemSkeleton';
import type { FollowUser } from '@/types/follow';

/**
 * UserList Props
 */
export interface UserListProps {
  /** Array of users to display */
  users: FollowUser[];
  /** Whether the initial data is loading */
  isLoading?: boolean;
  /** Whether more data is being loaded */
  isLoadingMore?: boolean;
  /** Whether there are more users to load */
  hasMore?: boolean;
  /** Callback to load more users */
  onLoadMore?: () => void;
  /** Message to show when list is empty */
  emptyMessage?: string;
  /** Title for empty state */
  emptyTitle?: string;
  /** Whether to show follow buttons */
  showFollowButtons?: boolean;
  /** Callback when a user is clicked */
  onUserClick?: (user: FollowUser) => void;
  /** Callback when follow status changes */
  onFollowChange?: (userPhone: string, isFollowing: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Number of skeleton items to show during initial load */
  skeletonCount?: number;
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  title: string;
  message: string;
}

function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <IconUsers className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {message}
      </p>
    </div>
  );
}

/**
 * UserList Component
 */
export function UserList({
  users,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No users found',
  emptyTitle = 'No Users',
  showFollowButtons = true,
  onUserClick,
  onFollowChange,
  className,
  skeletonCount = 5,
}: UserListProps) {
  // Ref for intersection observer target
  const observerTarget = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const target = observerTarget.current;
    
    if (!target || !hasMore || !onLoadMore || isLoadingMore) {
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Handle user click
  const handleUserClick = useCallback((user: FollowUser) => {
    onUserClick?.(user);
  }, [onUserClick]);

  // Handle follow status change
  const handleFollowChange = useCallback((userPhone: string, isFollowing: boolean) => {
    onFollowChange?.(userPhone, isFollowing);
  }, [onFollowChange]);

  // Show initial loading state
  if (isLoading && users.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <UserListItemSkeleton
            key={`skeleton-${index}`}
            showFollowButton={showFollowButtons}
          />
        ))}
      </div>
    );
  }

  // Show empty state
  if (!isLoading && users.length === 0) {
    return (
      <div className={className}>
        <EmptyState title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* User list */}
      {users.map((user) => (
        <UserListItem
          key={user.phone}
          user={user}
          showFollowButton={showFollowButtons}
          onUserClick={handleUserClick}
          onFollowChange={handleFollowChange}
        />
      ))}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <UserListItemSkeleton
              key={`loading-more-${index}`}
              showFollowButton={showFollowButtons}
            />
          ))}
        </div>
      )}

      {/* Intersection observer target for infinite scroll */}
      {hasMore && !isLoadingMore && (
        <div
          ref={observerTarget}
          className="h-4 w-full"
          aria-hidden="true"
        />
      )}

      {/* End of list indicator */}
      {!hasMore && users.length > 0 && (
        <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          No more users to show
        </div>
      )}
    </div>
  );
}

export default UserList;
