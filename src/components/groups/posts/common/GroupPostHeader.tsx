'use client';

import React from 'react';
import { IconDotsVertical } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GroupPostAvatar } from './GroupPostAvatar';

/**
 * GroupPostHeader component props
 */
interface GroupPostHeaderProps {
  /** Author display name */
  authorName: string;
  /** Author profile image URL */
  authorImage?: string;
  /** Formatted timestamp string */
  timestamp: string;
  /** Group name (for cross-posting context) */
  groupName?: string;
  /** Callback when menu button is clicked */
  onMenuClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format relative time from timestamp
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * GroupPostHeader component
 * 
 * Header row for group posts showing author info, timestamp, and menu.
 * Responsive design with touch-friendly menu button.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostHeader({
  authorName,
  authorImage,
  timestamp,
  groupName,
  onMenuClick,
  className,
}: GroupPostHeaderProps) {
  const displayTime = formatRelativeTime(timestamp);

  return (
    <div className={cn('flex items-start gap-2 sm:gap-3', className)}>
      {/* Author avatar */}
      <GroupPostAvatar
        imageUrl={authorImage}
        name={authorName}
        size="md"
      />

      {/* Author info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
            {authorName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {groupName && (
            <>
              <span className="text-gray-400 dark:text-gray-500">in</span>
              <span className="font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
                {groupName}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
            </>
          )}
          <time 
            dateTime={timestamp}
            className="text-gray-500 dark:text-gray-400"
          >
            {displayTime}
          </time>
        </div>
      </div>

      {/* Menu button */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className={cn(
            'min-w-[44px] min-h-[44px] p-2 -mr-2',
            'text-gray-400 dark:text-gray-500',
            'hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'active:scale-[0.95]'
          )}
          aria-label="Post options"
        >
          <IconDotsVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      )}
    </div>
  );
}

export default GroupPostHeader;
