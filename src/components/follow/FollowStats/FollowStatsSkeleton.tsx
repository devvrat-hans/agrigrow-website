'use client';

/**
 * FollowStatsSkeleton Component
 * 
 * A loading skeleton placeholder for the FollowStats component.
 * Shows two animated placeholder boxes for followers and following counts.
 */

import { cn } from '@/lib/utils';

/**
 * FollowStatsSkeleton Props
 */
export interface FollowStatsSkeletonProps {
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configuration for the skeleton
 */
const sizeConfig = {
  sm: {
    container: 'gap-3',
    stat: 'h-4 w-16',
  },
  md: {
    container: 'gap-4',
    stat: 'h-5 w-20',
  },
};

/**
 * FollowStatsSkeleton Component
 */
export function FollowStatsSkeleton({
  size = 'md',
  className,
}: FollowStatsSkeletonProps) {
  const styles = sizeConfig[size];

  return (
    <div
      role="status"
      aria-label="Loading follow statistics"
      className={cn(
        'flex items-center',
        styles.container,
        className
      )}
    >
      {/* Followers skeleton */}
      <div
        className={cn(
          'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
          styles.stat
        )}
      />
      
      {/* Separator */}
      <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
        •
      </span>
      
      {/* Following skeleton */}
      <div
        className={cn(
          'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
          styles.stat
        )}
      />
      
      <span className="sr-only">Loading follow statistics...</span>
    </div>
  );
}

export default FollowStatsSkeleton;
