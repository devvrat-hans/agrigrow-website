'use client';

import React from 'react';
import { IconHeart, IconHeartFilled, IconMessageCircle, IconShare } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * GroupPostActions component props
 */
interface GroupPostActionsProps {
  /** Number of likes */
  likeCount: number;
  /** Number of comments */
  commentCount: number;
  /** Whether the current user has liked this post */
  isLiked: boolean;
  /** Callback when like button is clicked */
  onLike: () => void;
  /** Callback when comment button is clicked */
  onComment: () => void;
  /** Callback when share button is clicked */
  onShare: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format count for display
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * GroupPostActions component
 * 
 * Action bar for group posts with like, comment, and share buttons.
 * Responsive design with touch-friendly targets.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostActions({
  likeCount,
  commentCount,
  isLiked,
  onLike,
  onComment,
  onShare,
  className,
}: GroupPostActionsProps) {
  return (
    <div 
      className={cn(
        'flex items-center gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800',
        className
      )}
    >
      {/* Like button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLike}
        className={cn(
          'min-h-[40px] px-2 sm:px-3 gap-1 sm:gap-2',
          'text-xs sm:text-sm font-medium',
          'active:scale-[0.95]',
          isLiked
            ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        )}
        aria-label={isLiked ? 'Unlike post' : 'Like post'}
        aria-pressed={isLiked}
      >
        {isLiked ? (
          <IconHeartFilled className="w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <IconHeart className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
        {likeCount > 0 && (
          <span>{formatCount(likeCount)}</span>
        )}
      </Button>

      {/* Comment button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onComment}
        className={cn(
          'min-h-[40px] px-2 sm:px-3 gap-1 sm:gap-2',
          'text-xs sm:text-sm font-medium',
          'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          'active:scale-[0.95]'
        )}
        aria-label="Comment on post"
      >
        <IconMessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        {commentCount > 0 && (
          <span>{formatCount(commentCount)}</span>
        )}
      </Button>

      {/* Share button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShare}
        className={cn(
          'min-h-[40px] px-2 sm:px-3 gap-1 sm:gap-2',
          'text-xs sm:text-sm font-medium',
          'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
          'active:scale-[0.95]',
          'ml-auto' // Push share to the right
        )}
        aria-label="Share post"
      >
        <IconShare className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </div>
  );
}

export default GroupPostActions;
