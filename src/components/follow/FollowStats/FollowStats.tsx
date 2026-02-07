'use client';

/**
 * FollowStats Component
 * 
 * Displays followers and following counts as clickable stats.
 * Supports large number formatting (e.g., 1.2K, 3.5M).
 */

import { cn } from '@/lib/utils';

/**
 * FollowStats Props
 */
export interface FollowStatsProps {
  /** Number of followers */
  followersCount: number;
  /** Number of users being followed */
  followingCount: number;
  /** Callback when followers count is clicked */
  onFollowersClick?: () => void;
  /** Callback when following count is clicked */
  onFollowingClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Show full labels or abbreviated */
  fullLabel?: boolean;
}

/**
 * Format large numbers with K, M, B suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Size configuration
 */
const sizeConfig = {
  sm: {
    container: 'gap-3',
    count: 'text-sm font-semibold',
    label: 'text-xs',
  },
  md: {
    container: 'gap-4',
    count: 'text-base font-semibold',
    label: 'text-sm',
  },
};

/**
 * Single stat item component
 */
interface StatItemProps {
  count: number;
  label: string;
  onClick?: () => void;
  size: 'sm' | 'md';
  testId?: string;
}

function StatItem({ count, label, onClick, size, testId }: StatItemProps) {
  const styles = sizeConfig[size];
  const isClickable = !!onClick;

  const content = (
    <>
      <span className={cn(styles.count, 'text-gray-900 dark:text-gray-100')}>
        {formatNumber(count)}
      </span>
      <span className={cn(styles.label, 'text-gray-500 dark:text-gray-400 ml-1')}>
        {label}
      </span>
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className={cn(
          'inline-flex items-center hover:underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm',
          'transition-colors duration-200'
        )}
        aria-label={`${count} ${label}, click to view list`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center" data-testid={testId}>
      {content}
    </span>
  );
}

/**
 * FollowStats Component
 */
export function FollowStats({
  followersCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
  size = 'md',
  className,
  fullLabel = true,
}: FollowStatsProps) {
  const styles = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center',
        styles.container,
        className
      )}
      role="group"
      aria-label="Follow statistics"
    >
      <StatItem
        count={followersCount}
        label={fullLabel ? 'Followers' : 'Flwrs'}
        onClick={onFollowersClick}
        size={size}
        testId="followers-stat"
      />
      <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
        •
      </span>
      <StatItem
        count={followingCount}
        label={fullLabel ? 'Following' : 'Flwng'}
        onClick={onFollowingClick}
        size={size}
        testId="following-stat"
      />
    </div>
  );
}

export default FollowStats;

/**
 * Export the formatNumber utility for reuse
 */
export { formatNumber };
