'use client';

/**
 * FollowRequestsList Component
 * 
 * Displays a list of pending follow requests with actions.
 */

import { useCallback } from 'react';
import { IconUserPlus, IconInbox } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FollowRequestItem } from './FollowRequestItem';
import type { FollowRequest } from '@/types/follow';

/**
 * FollowRequestsList Props
 */
export interface FollowRequestsListProps {
  /** Array of follow requests */
  requests: FollowRequest[];
  /** Callback when a request is accepted */
  onAccept: (requestId: string) => void;
  /** Callback when a request is rejected */
  onReject: (requestId: string) => void;
  /** Whether the data is loading */
  isLoading?: boolean;
  /** Set of request IDs currently being processed */
  processingIds?: Set<string>;
  /** Additional CSS classes */
  className?: string;
  /** Number of skeleton items to show */
  skeletonCount?: number;
}

/**
 * Skeleton component for loading state
 */
function RequestSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading request"
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700'
      )}
    >
      {/* Avatar skeleton */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Text skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Buttons skeleton */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
      
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <IconInbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        No Pending Requests
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        When someone requests to follow you, it will appear here
      </p>
    </div>
  );
}

/**
 * Header component with count
 */
interface ListHeaderProps {
  count: number;
}

function ListHeader({ count }: ListHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <IconUserPlus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Follow Requests
      </h2>
      {count > 0 && (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * FollowRequestsList Component
 */
export function FollowRequestsList({
  requests,
  onAccept,
  onReject,
  isLoading = false,
  processingIds = new Set(),
  className,
  skeletonCount = 3,
}: FollowRequestsListProps) {
  // Check if a specific request is processing
  const isProcessing = useCallback((requestId: string): boolean => {
    return processingIds.has(requestId);
  }, [processingIds]);

  // Show loading state
  if (isLoading && requests.length === 0) {
    return (
      <div className={className}>
        <ListHeader count={0} />
        <div className="space-y-2">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <RequestSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (!isLoading && requests.length === 0) {
    return (
      <div className={className}>
        <ListHeader count={0} />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={className}>
      <ListHeader count={requests.length} />
      
      <div className="space-y-2">
        {requests.map((request) => (
          <FollowRequestItem
            key={request.id}
            request={request}
            onAccept={onAccept}
            onReject={onReject}
            isProcessing={isProcessing(request.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default FollowRequestsList;
