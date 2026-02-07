'use client';

import React, { useState, useMemo } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '@/hooks';
import { PostType, getPostTypeColor } from '../FeedItemCard';

/**
 * Content length for truncation
 */
const CONTENT_TRUNCATE_LENGTH = 300;

/**
 * Original post data for reposts (simplified version)
 */
export interface OriginalPostData {
  _id: string;
  content: string;
  author: {
    id: string;
    _id?: string;
    name: string;
    fullName?: string;
    profileImage?: string;
    avatar?: string;
  };
  createdAt?: string;
}

/**
 * Props for FeedItemContent component
 */
interface FeedItemContentProps {
  /** Post type for badge display */
  postType: PostType;
  /** Main content text */
  content: string;
  /** Crop tags to display */
  tags?: string[];
  /** Whether this is a repost */
  isRepost?: boolean;
  /** Original post data if repost */
  originalPost?: OriginalPostData;
  /** Repost text added by reposter */
  repostText?: string;
  /** Initial expanded state */
  initialExpanded?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Format post type label
 */
function formatPostTypeLabel(type: PostType): string {
  switch (type) {
    case 'success_story':
      return 'Success Story';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
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
 * OriginalPostCard Component
 * Shows the original post for reposts
 */
function OriginalPostCard({ post }: { post: OriginalPostData }) {
  const authorName = post.author.fullName || post.author.name;
  const authorAvatar = post.author.profileImage || post.author.avatar;

  return (
    <div className="p-2.5 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">Reposted from</span>
      </div>
      <div className="flex gap-2">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-medium flex-shrink-0">
            {getInitials(authorName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-sm font-medium">
            {authorName}
          </span>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {post.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FeedItemContent Component
 * 
 * Displays the content section of a feed item including post type badge,
 * text content with truncation, repost information, and tags.
 * 
 * Mobile-optimized with:
 * - Responsive font sizing (text-sm on mobile, text-base on sm+)
 * - Responsive tag padding (px-2 py-0.5 on mobile, px-2.5 py-1 on sm+)
 * - Leading-relaxed for better readability
 */
export function FeedItemContent({
  postType,
  content,
  tags = [],
  isRepost = false,
  originalPost,
  repostText,
  initialExpanded = false,
  className,
}: FeedItemContentProps) {
  const { isMobile } = useMobile();
  const [isContentExpanded, setIsContentExpanded] = useState(initialExpanded);

  // Content truncation
  const shouldTruncate = content.length > CONTENT_TRUNCATE_LENGTH;
  const displayContent = useMemo(() => {
    if (!shouldTruncate || isContentExpanded) {
      return content;
    }
    return content.slice(0, CONTENT_TRUNCATE_LENGTH).trim() + '...';
  }, [content, shouldTruncate, isContentExpanded]);

  return (
    <div className={cn('px-3 sm:px-4 py-2 sm:py-3', className)}>
      {/* Post Type Badge */}
      <Badge className={cn('mb-2', getPostTypeColor(postType))}>
        {formatPostTypeLabel(postType)}
      </Badge>

      {/* Repost indicator and original post */}
      {isRepost && originalPost && (
        <OriginalPostCard post={originalPost} />
      )}

      {/* Repost text (if any) */}
      {isRepost && repostText && (
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
          &quot;{repostText}&quot;
        </p>
      )}

      {/* Post Content - responsive font sizing with better line height */}
      <p className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
        {displayContent}
      </p>

      {/* Read More / Less button */}
      {shouldTruncate && (
        <button
          onClick={() => setIsContentExpanded(!isContentExpanded)}
          className={cn(
            'text-xs sm:text-sm text-primary-600 dark:text-primary-400',
            'hover:underline mt-1 flex items-center gap-1',
            // Minimum touch target
            'min-h-[36px] sm:min-h-[auto]'
          )}
        >
          {isContentExpanded ? (
            <>
              Show less <IconChevronUp size={isMobile ? 12 : 14} />
            </>
          ) : (
            <>
              Read more <IconChevronDown size={isMobile ? 12 : 14} />
            </>
          )}
        </button>
      )}

      {/* Tags/Crops - responsive padding */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={cn(
                // Responsive padding for tags
                'px-2 py-0.5 sm:px-2.5 sm:py-1',
                'rounded-full text-xs',
                'bg-green-100 text-green-700',
                'dark:bg-green-900 dark:text-green-300'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedItemContent;
