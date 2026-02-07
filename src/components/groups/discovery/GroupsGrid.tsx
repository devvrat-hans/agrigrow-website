'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GroupCard } from '../common/GroupCard';
import { GroupData } from '@/types/group';
import { IconMoodEmpty } from '@tabler/icons-react';

/**
 * GroupsGrid component props
 */
interface GroupsGridProps {
  /** Array of groups to display */
  groups: GroupData[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when join button is clicked */
  onJoin?: (groupId: string) => void;
  /** ID of group currently being joined */
  joiningGroupId?: string | null;
  /** Card variant to use */
  variant?: 'compact' | 'full';
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loading card for groups - Compact variant
 */
function CompactSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="h-11 w-[72px] bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton loading card for groups - Full variant
 */
function FullSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="h-28 sm:h-36 bg-gray-200 dark:bg-gray-700 relative">
        <div className="absolute -bottom-8 left-4">
          <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-900" />
        </div>
      </div>
      <div className="pt-10 pb-4 px-4 space-y-3">
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-11 w-[100px] bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading card for groups
 */
function GroupCardSkeleton({ variant = 'full' }: { variant?: 'compact' | 'full' }) {
  if (variant === 'compact') {
    return <CompactSkeleton />;
  }
  return <FullSkeleton />;
}

/**
 * Empty state component for when no groups are found
 */
function EmptyState({ 
  message = 'No communities found',
  description = 'Try adjusting your filters or search to find communities.'
}: { 
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 p-4 sm:p-6 text-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <IconMoodEmpty className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
        {message}
      </h3>
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-sm">
        {description}
      </p>
    </div>
  );
}

/**
 * GroupsGrid component
 * 
 * Responsive grid layout for displaying GroupCard components.
 * 1 column on mobile, 2 columns on tablet, 3 columns on desktop.
 * Handles loading and empty states.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupsGrid({
  groups,
  isLoading = false,
  onJoin,
  joiningGroupId,
  variant = 'full',
  emptyMessage,
  emptyDescription,
  className,
}: GroupsGridProps) {
  // Show loading skeletons
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          variant === 'full' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1',
          className
        )}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <GroupCardSkeleton key={index} variant={variant} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (groups.length === 0) {
    return (
      <EmptyState 
        message={emptyMessage} 
        description={emptyDescription} 
      />
    );
  }

  // Render grid of groups
  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        variant === 'full' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1',
        className
      )}
    >
      {groups.map((group) => (
        <GroupCard
          key={group._id}
          group={group}
          variant={variant}
          onJoin={onJoin}
          isJoining={joiningGroupId === group._id}
          showJoinButton={!!onJoin}
        />
      ))}
    </div>
  );
}

export default GroupsGrid;
