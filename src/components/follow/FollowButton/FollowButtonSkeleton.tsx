'use client';

/**
 * FollowButtonSkeleton Component
 * 
 * A loading skeleton placeholder for the FollowButton component.
 * Matches the same sizes as the actual button.
 */

import { cn } from '@/lib/utils';
import type { FollowButtonSize } from '@/types/follow';

/**
 * FollowButtonSkeleton Props
 */
export interface FollowButtonSkeletonProps {
  /** Size of the skeleton button */
  size?: FollowButtonSize;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a wider skeleton (for label) */
  showLabel?: boolean;
}

/**
 * Size configuration for the skeleton
 */
const sizeConfig = {
  sm: {
    base: 'h-7',
    withLabel: 'w-[70px]',
    iconOnly: 'w-7',
  },
  md: {
    base: 'h-8',
    withLabel: 'w-[85px]',
    iconOnly: 'w-8',
  },
  lg: {
    base: 'h-9',
    withLabel: 'w-[100px]',
    iconOnly: 'w-9',
  },
};

/**
 * FollowButtonSkeleton Component
 */
export function FollowButtonSkeleton({
  size = 'md',
  className,
  showLabel = true,
}: FollowButtonSkeletonProps) {
  const sizeStyles = sizeConfig[size];

  return (
    <div
      role="status"
      aria-label="Loading follow button"
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        sizeStyles.base,
        showLabel ? sizeStyles.withLabel : sizeStyles.iconOnly,
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default FollowButtonSkeleton;
