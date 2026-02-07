'use client';

/**
 * UserListItemSkeleton Component
 * 
 * A loading skeleton placeholder for the UserListItem component.
 * Shows animated placeholders for avatar, text, and button.
 */

import { cn } from '@/lib/utils';

/**
 * UserListItemSkeleton Props
 */
export interface UserListItemSkeletonProps {
  /** Whether to show the follow button placeholder */
  showFollowButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UserListItemSkeleton Component
 */
export function UserListItemSkeleton({
  showFollowButton = true,
  className,
}: UserListItemSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading user"
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      {/* Avatar skeleton */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Text content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Name and role badge */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        
        {/* Phone number */}
        <div className="h-3.5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        
        {/* Location */}
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Follow button skeleton */}
      {showFollowButton && (
        <div className="flex-shrink-0">
          <div className="h-7 w-[70px] bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>
      )}
      
      <span className="sr-only">Loading user...</span>
    </div>
  );
}

export default UserListItemSkeleton;
