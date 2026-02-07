'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { IconTrendingUp, IconChevronRight, IconMoodEmpty, IconFlame } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { GroupCard } from '../common/GroupCard';
import { GroupData } from '@/types/group';

/**
 * PopularGroups component props
 */
interface PopularGroupsProps {
  /** Array of popular groups */
  groups: GroupData[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when join button is clicked */
  onJoin?: (groupId: string) => void;
  /** ID of group currently being joined */
  joiningGroupId?: string | null;
  /** Link for "See all" button */
  seeAllLink?: string;
  /** Section title */
  title?: string;
  /** Section icon */
  icon?: 'trending' | 'flame';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton loader for compact card
 */
function CompactCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-full sm:w-[280px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 animate-pulse">
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
 * Full card skeleton
 */
function FullCardSkeleton() {
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
 * PopularGroups component
 * 
 * Displays trending/popular groups in a similar layout to RecommendedGroups.
 * Horizontal scroll on mobile, grid on desktop.
 * 
 * Features:
 * - Horizontal scroll with momentum on mobile
 * - Grid layout on desktop
 * - Loading skeletons
 * - Empty state
 * - "See all" link
 * - Customizable title and icon
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function PopularGroups({
  groups,
  isLoading = false,
  onJoin,
  joiningGroupId,
  seeAllLink = '/communities/popular',
  title = 'Popular Communities',
  icon = 'trending',
  className,
}: PopularGroupsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const IconComponent = icon === 'flame' ? IconFlame : IconTrendingUp;

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
            {Array.from({ length: 4 }).map((_, i) => (
              <FullCardSkeleton key={i} />
            ))}
          </div>
        </div>
        
        {/* Desktop: List */}
        <div className="hidden lg:grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CompactCardSkeleton key={i} />
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
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <IconMoodEmpty className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No popular communities yet
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
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
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

      {/* Mobile: Horizontal scroll with full cards */}
      <div
        ref={scrollContainerRef}
        className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
      >
        <div className="flex gap-3">
          {groups.slice(0, 8).map((group, index) => (
            <div key={group._id} className="snap-start flex-shrink-0 min-w-[260px] sm:min-w-[280px] w-[260px] sm:w-[280px] md:w-[320px]">
              <div className="relative">
                {/* Rank badge */}
                <div
                  className={cn(
                    'absolute -top-1 -left-1 z-10',
                    'w-6 h-6 rounded-full',
                    'flex items-center justify-center',
                    'text-xs font-bold',
                    'shadow-lg',
                    index < 3
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {index + 1}
                </div>
                <GroupCard
                  group={group}
                  variant="full"
                  onJoin={onJoin}
                  isJoining={joiningGroupId === group._id}
                  showJoinButton={!!onJoin}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Vertical list with compact cards */}
      <div className="hidden lg:grid grid-cols-1 gap-3">
        {groups.slice(0, 5).map((group, index) => (
          <div key={group._id} className="relative">
            {/* Rank badge */}
            <div
              className={cn(
                'absolute -top-1 -left-1 z-10',
                'w-6 h-6 rounded-full',
                'flex items-center justify-center',
                'text-xs font-bold',
                'shadow-lg',
                index < 3
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}
            >
              {index + 1}
            </div>
            <GroupCard
              group={group}
              variant="compact"
              onJoin={onJoin}
              isJoining={joiningGroupId === group._id}
              showJoinButton={!!onJoin}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default PopularGroups;
