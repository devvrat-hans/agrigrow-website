'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { IconSparkles, IconChevronRight, IconMoodEmpty } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { GroupCard } from '../common/GroupCard';
import { GroupData } from '@/types/group';

/**
 * RecommendedGroups component props
 */
interface RecommendedGroupsProps {
  /** Array of recommended groups */
  groups: GroupData[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when join button is clicked */
  onJoin?: (groupId: string) => void;
  /** ID of group currently being joined */
  joiningGroupId?: string | null;
  /** Link for "See all" button */
  seeAllLink?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for horizontal scroll card
 */
function HorizontalCardSkeleton() {
  return (
    <div className="flex-shrink-0 min-w-[260px] sm:min-w-[280px] w-[260px] sm:w-[280px] md:w-[320px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="h-24 bg-gray-200 dark:bg-gray-700 relative">
        <div className="absolute -bottom-6 left-3">
          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-900" />
        </div>
      </div>
      <div className="pt-8 pb-3 px-3 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact group card for horizontal scroll
 */
function HorizontalGroupCard({
  group,
  onJoin,
  isJoining = false,
}: {
  group: GroupData;
  onJoin?: (groupId: string) => void;
  isJoining?: boolean;
}) {
  return (
    <div className="flex-shrink-0 min-w-[260px] sm:min-w-[280px] w-[260px] sm:w-[280px] md:w-[320px]">
      <GroupCard
        group={group}
        variant="full"
        onJoin={onJoin}
        isJoining={isJoining}
        showJoinButton={!!onJoin}
        className="h-full"
      />
    </div>
  );
}

/**
 * RecommendedGroups component
 * 
 * Displays AI-recommended groups in a horizontal scroll on mobile,
 * grid layout on desktop. Includes "See all" link.
 * 
 * Features:
 * - Horizontal scroll with momentum on mobile
 * - Grid layout on desktop (3 columns)
 * - Loading skeletons
 * - Empty state
 * - "See all" link
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function RecommendedGroups({
  groups,
  isLoading = false,
  onJoin,
  joiningGroupId,
  seeAllLink = '/communities/discover',
  className,
}: RecommendedGroupsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Loading state
  if (isLoading) {
    return (
      <section className={cn('py-4', className)}>
        <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        
        {/* Mobile: Horizontal scroll */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <HorizontalCardSkeleton key={i} />
            ))}
          </div>
        </div>
        
        {/* Desktop: Grid */}
        <div className="hidden lg:grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <HorizontalCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <section className={cn('py-4', className)}>
        <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
          <div className="flex items-center gap-2">
            <IconSparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recommended for You
            </h2>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <IconMoodEmpty className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete your profile to get personalized recommendations
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('py-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <IconSparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recommended for You
          </h2>
        </div>
        
        {seeAllLink && groups.length > 0 && (
          <Link
            href={seeAllLink}
            className={cn(
              'min-h-[44px] inline-flex items-center gap-1 text-sm font-medium',
              'text-primary-600 dark:text-primary-400',
              'hover:text-primary-700 dark:hover:text-primary-300',
              'transition-colors duration-200',
              'active:scale-[0.95]'
            )}
          >
            See all
            <IconChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Mobile: Horizontal scroll */}
      <div
        ref={scrollContainerRef}
        className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
      >
        <div className="flex gap-3">
          {groups.slice(0, 6).map((group) => (
            <div key={group._id} className="snap-start">
              <HorizontalGroupCard
                group={group}
                onJoin={onJoin}
                isJoining={joiningGroupId === group._id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {groups.slice(0, 3).map((group) => (
          <GroupCard
            key={group._id}
            group={group}
            variant="full"
            onJoin={onJoin}
            isJoining={joiningGroupId === group._id}
            showJoinButton={!!onJoin}
          />
        ))}
      </div>
    </section>
  );
}

export default RecommendedGroups;
