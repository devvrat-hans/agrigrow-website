'use client';

/**
 * FollowRequestItem Component
 * 
 * Displays a single follow request with accept/reject actions.
 */

import { useCallback } from 'react';
import { IconCheck, IconX, IconUser, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ResponsiveImage } from '@/components/common';
import type { FollowRequest } from '@/types/follow';

/**
 * FollowRequestItem Props
 */
export interface FollowRequestItemProps {
  /** Follow request data */
  request: FollowRequest;
  /** Callback when accept is clicked */
  onAccept: (requestId: string) => void;
  /** Callback when reject is clicked */
  onReject: (requestId: string) => void;
  /** Whether the request is being processed */
  isProcessing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get user initials for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * FollowRequestItem Component
 */
export function FollowRequestItem({
  request,
  onAccept,
  onReject,
  isProcessing = false,
  className,
}: FollowRequestItemProps) {
  const { user, createdAt } = request;

  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isProcessing) {
      onAccept(request.id);
    }
  }, [isProcessing, onAccept, request.id]);

  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isProcessing) {
      onReject(request.id);
    }
  }, [isProcessing, onReject, request.id]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        isProcessing && 'opacity-60',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.profileImage ? (
          <ResponsiveImage
            src={user.profileImage}
            alt={user.fullName}
            containerClassName="w-12 h-12 border-2 border-gray-100 dark:border-gray-700"
            isAvatar
            loading="lazy"
            fallbackComponent={
              <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials(user.fullName) || <IconUser className="w-5 h-5" />}
              </div>
            }
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(user.fullName) || <IconUser className="w-5 h-5" />}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {user.fullName}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          wants to follow you
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatRelativeTime(createdAt)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isProcessing ? (
          <div className="flex items-center justify-center w-[76px] h-8">
            <IconLoader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Accept button */}
            <button
              type="button"
              onClick={handleAccept}
              disabled={isProcessing}
              className={cn(
                'inline-flex items-center justify-center',
                'h-8 px-3 gap-1',
                'text-sm font-medium',
                'rounded-md',
                'bg-green-600 text-white',
                'hover:bg-green-700',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-800',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={`Accept follow request from ${user.fullName}`}
            >
              <IconCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Accept</span>
            </button>

            {/* Reject button */}
            <button
              type="button"
              onClick={handleReject}
              disabled={isProcessing}
              className={cn(
                'inline-flex items-center justify-center',
                'h-8 px-3 gap-1',
                'text-sm font-medium',
                'rounded-md',
                'bg-gray-100 dark:bg-gray-700',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-red-50 hover:text-red-600',
                'dark:hover:bg-red-900/20 dark:hover:text-red-400',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-800',
                'transition-colors duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={`Reject follow request from ${user.fullName}`}
            >
              <IconX className="w-4 h-4" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default FollowRequestItem;
