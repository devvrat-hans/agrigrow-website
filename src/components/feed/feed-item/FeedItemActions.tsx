'use client';

import React from 'react';
import {
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconShare,
  IconRefresh,
  IconBookmark,
  IconBookmarkFilled,
  IconLoader2,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks';

/**
 * Props for FeedItemActions component
 */
interface FeedItemActionsProps {
  /** Number of likes */
  likesCount: number;
  /** Number of comments */
  commentsCount: number;
  /** Number of shares */
  sharesCount?: number;
  /** Number of reposts */
  repostsCount?: number;
  /** Whether the post is liked by current user */
  isLiked?: boolean;
  /** Whether the post is saved by current user */
  isSaved?: boolean;
  /** Whether the post is reposted by current user */
  isReposted?: boolean;
  /** Whether like action is in progress */
  isLiking?: boolean;
  /** Whether save action is in progress */
  isSaving?: boolean;
  /** Whether repost action is in progress */
  isReposting?: boolean;
  /** Handler for like action */
  onLike?: () => void;
  /** Handler for comment action */
  onComment?: () => void;
  /** Handler for share action */
  onShare?: () => void;
  /** Handler for save/bookmark action */
  onSave?: () => void;
  /** Handler for repost action */
  onRepost?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Format count for display (e.g., 1500 -> 1.5k)
 */
function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (count < 1000000) return Math.floor(count / 1000) + 'k';
  return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
}

/**
 * ActionButton Component
 * Internal component for consistent action button styling
 */
interface ActionButtonProps {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  isActive?: boolean;
  isLoading?: boolean;
  count?: number;
  label: string;
  onClick?: () => void;
  activeColor?: string;
  className?: string;
}

function ActionButton({
  icon,
  activeIcon,
  isActive = false,
  isLoading = false,
  count,
  label,
  onClick,
  activeColor = 'text-primary-500',
  className,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        // Minimum 44px touch target height
        'flex items-center gap-1 sm:gap-1.5 min-h-[44px] px-2 sm:px-3',
        'rounded-full',
        'text-gray-500 dark:text-gray-400',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'active:scale-95',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        isActive && activeColor,
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={label}
      aria-pressed={isActive}
    >
      {isLoading ? (
        <IconLoader2 className="animate-spin" size={18} />
      ) : isActive && activeIcon ? (
        activeIcon
      ) : (
        icon
      )}
      {count !== undefined && (
        <span className={cn(
          'text-xs sm:text-sm tabular-nums',
          // Hide on very small screens (< 360px), show on xs+
          'hidden xs:inline'
        )}>
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}

/**
 * FeedItemActions Component
 * 
 * Displays action buttons for feed items (like, comment, share, save).
 * 
 * Mobile-optimized with:
 * - Minimum 44px touch target height
 * - Responsive icon sizes (18px mobile, 20px desktop)
 * - Text labels hidden on screens < 360px, shown on sm+
 */
export function FeedItemActions({
  likesCount,
  commentsCount,
  sharesCount = 0,
  repostsCount = 0,
  isLiked = false,
  isSaved = false,
  isReposted = false,
  isLiking = false,
  isSaving = false,
  isReposting = false,
  onLike,
  onComment,
  onShare,
  onSave,
  onRepost,
  className,
}: FeedItemActionsProps) {
  const { isMobile } = useMobile();
  
  // Responsive icon sizes: 18px on mobile, 20px on desktop
  const iconSize = isMobile ? 18 : 20;

  return (
    <div 
      className={cn(
        'flex items-center justify-between px-2 sm:px-4 py-1 sm:py-2',
        'border-t border-gray-100 dark:border-gray-800',
        className
      )}
    >
      {/* Left side: Like, Comment, Share */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Like Button */}
        <ActionButton
          icon={<IconHeart size={iconSize} />}
          activeIcon={<IconHeartFilled size={iconSize} className="text-red-500" />}
          isActive={isLiked}
          isLoading={isLiking}
          count={likesCount}
          label={isLiked ? 'Unlike' : 'Like'}
          onClick={onLike}
          activeColor="text-red-500"
        />

        {/* Comment Button */}
        <ActionButton
          icon={<IconMessageCircle size={iconSize} />}
          count={commentsCount}
          label="Comment"
          onClick={onComment}
        />

        {/* Repost Button */}
        <ActionButton
          icon={<IconRefresh size={iconSize} />}
          isActive={isReposted}
          isLoading={isReposting}
          count={repostsCount > 0 ? repostsCount : undefined}
          label={isReposted ? 'Reposted' : 'Repost'}
          onClick={onRepost}
          activeColor="text-primary-500"
        />

        {/* Share Button */}
        <ActionButton
          icon={<IconShare size={iconSize} />}
          count={sharesCount > 0 ? sharesCount : undefined}
          label="Share"
          onClick={onShare}
        />
      </div>

      {/* Right side: Save/Bookmark */}
      <div className="flex items-center">
        <ActionButton
          icon={<IconBookmark size={iconSize} />}
          activeIcon={<IconBookmarkFilled size={iconSize} className="text-primary-500" />}
          isActive={isSaved}
          isLoading={isSaving}
          label={isSaved ? 'Unsave' : 'Save'}
          onClick={onSave}
          activeColor="text-primary-500"
        />
      </div>
    </div>
  );
}

export default FeedItemActions;
