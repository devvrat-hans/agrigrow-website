'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  IconDotsVertical,
  IconFlag,
  IconEyeOff,
  IconLink,
  IconCheck,
  IconQuestionMark,
  IconMessage,
  IconBulb,
  IconAlertTriangle,
  IconTrophy,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMobile } from '@/hooks';
import { PostType, formatRelativeTime } from '../FeedItemCard';

/**
 * Author data interface for FeedItemHeader
 */
export interface FeedItemHeaderAuthor {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  role: string;
  avatar?: string;
  profileImage?: string;
}

/**
 * Props for FeedItemHeader component
 */
interface FeedItemHeaderProps {
  /** Author data */
  author: FeedItemHeaderAuthor;
  /** Post creation timestamp */
  timestamp: string;
  /** Post type for badge display */
  postType: PostType;
  /** Post ID for link generation */
  postId: string;
  /** Handler for report action */
  onReport?: () => void;
  /** Handler for hide action */
  onHide?: () => void;
  /** Handler for copy link - returns success status */
  onCopyLink?: () => Promise<boolean> | boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get author initials for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get icon component for post type
 */
function getPostTypeIcon(type: PostType): React.ComponentType<{ size?: number; className?: string }> {
  switch (type) {
    case 'question':
      return IconQuestionMark;
    case 'update':
    case 'news':
      return IconMessage;
    case 'tip':
    case 'technique':
      return IconBulb;
    case 'problem':
      return IconAlertTriangle;
    case 'success_story':
      return IconTrophy;
    case 'technology':
      return IconBulb;
    case 'post':
    default:
      return IconMessage;
  }
}

/**
 * Get icon color for post type
 */
function getPostTypeIconColor(type: PostType): string {
  switch (type) {
    case 'question':
      return 'text-blue-500';
    case 'update':
    case 'news':
      return 'text-gray-500';
    case 'tip':
    case 'technique':
      return 'text-yellow-500';
    case 'problem':
      return 'text-red-500';
    case 'success_story':
      return 'text-green-500';
    case 'technology':
      return 'text-purple-500';
    case 'post':
    default:
      return 'text-gray-500';
  }
}

/**
 * Format post type label
 */
function formatPostTypeLabelLocal(type: PostType): string {
  switch (type) {
    case 'success_story':
      return 'Success Story';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * FeedItemHeader Component
 * 
 * Displays the header section of a feed item with author avatar, name, role badge,
 * timestamp, and a dropdown menu with actions (copy link, hide, report).
 * 
 * Mobile-optimized with:
 * - Responsive avatar size (w-9 h-9 on mobile, w-10 h-10 on sm+)
 * - Responsive text sizing (text-sm on mobile, text-base on sm+)
 * - 44px minimum touch target for menu button
 */
export function FeedItemHeader({
  author,
  timestamp,
  postType,
  postId,
  onReport,
  onHide,
  onCopyLink,
  className,
}: FeedItemHeaderProps) {
  const { isMobile } = useMobile();
  const [linkCopied, setLinkCopied] = useState(false);

  // Normalize author data
  const authorName = author.fullName || author.name;
  const authorAvatar = author.profileImage || author.avatar;
  const authorId = author._id || author.id;

  /**
   * Handle copy link action
   */
  const handleCopyLink = useCallback(async () => {
    if (onCopyLink) {
      const success = await onCopyLink();
      if (success) {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } else {
      // Default copy link behavior
      const shareLink = `${window.location.origin}/post/${postId}`;
      try {
        await navigator.clipboard.writeText(shareLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    }
  }, [onCopyLink, postId]);

  return (
    <div className={cn('flex items-center justify-between p-3 sm:p-4 pb-0', className)}>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Author Avatar - responsive sizing */}
        <Link href={`/profile/${authorId}`} className="flex-shrink-0 flex items-center">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm sm:text-base border-2 border-primary-200 dark:border-primary-700">
              {getInitials(authorName)}
            </div>
          )}
        </Link>

        {/* Author Info */}
        <div className="min-w-0 flex-1 flex items-center overflow-hidden">
          <div className="flex items-center gap-1.5 h-5">
            <Link
              href={`/profile/${authorId}`}
              className="font-semibold text-sm sm:text-base hover:underline truncate inline-flex items-center"
            >
              {authorName}
            </Link>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 capitalize flex-shrink-0 inline-flex items-center h-4"
            >
              {author.role}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 inline-flex items-center">
              · {formatRelativeTime(timestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* Post Type Icon and More Options */}
      <div className="flex items-center gap-1">
        {/* Post Type Icon */}
        {(() => {
          const PostTypeIcon = getPostTypeIcon(postType);
          return (
            <div 
              className={cn(
                "p-2 rounded-full flex items-center justify-center",
                getPostTypeIconColor(postType)
              )}
              title={formatPostTypeLabelLocal(postType)}
            >
              <PostTypeIcon size={18} />
            </div>
          );
        })()}

        {/* More Options Dropdown - 44px minimum touch target */}
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className={cn(
              // Minimum 44px touch target for accessibility
              'min-w-[44px] min-h-[44px] p-2.5 -mr-1 sm:mr-0',
              'rounded-full flex items-center justify-center',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors active:scale-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
            )}
            aria-label="More options"
          >
            <IconDotsVertical 
              size={isMobile ? 18 : 20} 
              className="text-gray-500" 
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink} className="min-h-[44px]">
            {linkCopied ? (
              <>
                <IconCheck size={16} className="mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <IconLink size={16} className="mr-2" />
                Copy link
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {onHide && (
            <DropdownMenuItem onClick={onHide} className="min-h-[44px]">
              <IconEyeOff size={16} className="mr-2" />
              Hide this post
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={onReport}
            className="text-red-500 focus:text-red-500 min-h-[44px]"
          >
            <IconFlag size={16} className="mr-2" />
            Report post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
}

export default FeedItemHeader;
