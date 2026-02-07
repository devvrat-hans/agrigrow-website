'use client';

import React, { useState } from 'react';
import {
  IconPin,
  IconPinnedFilled,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconShare,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconClock,
  IconCheck,
  IconHelpCircle,
  IconSpeakerphone,
  IconChartBar,
  IconFileText,
  IconShieldCheck,
  IconCrown,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageGallery } from '@/components/feed/ImageGallery';
import { ResponsiveImage } from '@/components/common';
import {
  GroupPostData,
  GroupPostType,
  MemberRole,
  POST_TYPE_LABELS,
  PollData,
} from '@/types/group';

/**
 * Post type icons mapping
 */
const postTypeIcons: Record<GroupPostType, React.ReactNode> = {
  discussion: <IconMessageCircle className="w-3.5 h-3.5" />,
  question: <IconHelpCircle className="w-3.5 h-3.5" />,
  announcement: <IconSpeakerphone className="w-3.5 h-3.5" />,
  poll: <IconChartBar className="w-3.5 h-3.5" />,
  resource: <IconFileText className="w-3.5 h-3.5" />,
};

/**
 * Post type colors
 */
const postTypeColors: Record<GroupPostType, { bg: string; text: string }> = {
  discussion: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  question: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-700 dark:text-purple-300',
  },
  announcement: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  poll: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  resource: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
};

/**
 * Role badge configuration
 */
const roleBadges: Record<MemberRole, { label: string; color: string; icon: React.ReactNode } | null> = {
  owner: {
    label: 'Owner',
    color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    icon: <IconCrown className="w-3 h-3" />,
  },
  admin: {
    label: 'Admin',
    color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    icon: <IconShieldCheck className="w-3 h-3" />,
  },
  moderator: {
    label: 'Mod',
    color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    icon: <IconShieldCheck className="w-3 h-3" />,
  },
  member: null, // No badge for regular members
};

/**
 * GroupPostCard component props
 */
interface GroupPostCardProps {
  /** Post data */
  post: GroupPostData;
  /** Current user's ID */
  currentUserId?: string;
  /** Group ID */
  groupId: string;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Whether user is author of the post */
  isAuthor?: boolean;
  /** Author's role in the group */
  authorRole?: MemberRole;
  /** Callback when like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when comment button is clicked */
  onComment?: (postId: string) => void;
  /** Callback when share button is clicked */
  onShare?: (postId: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (postId: string) => void;
  /** Callback when edit is clicked */
  onEdit?: (postId: string) => void;
  /** Callback when pin is clicked */
  onPin?: (postId: string, isPinned: boolean) => void;
  /** Callback when poll vote is cast */
  onVote?: (postId: string, optionIndex: number) => void;
  /** Max content length before truncation */
  maxContentLength?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format number with abbreviation
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Get first letter for avatar fallback
 */
function getInitial(name?: string): string {
  return name?.charAt(0).toUpperCase() || 'U';
}

/**
 * Calculate percentage for poll option
 */
function calculatePercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
}

/**
 * Poll Display Component
 */
interface PollDisplayProps {
  poll: PollData;
  postId: string;
  hasVoted?: boolean;
  userVoteIndex?: number;
  onVote?: (postId: string, optionIndex: number) => void;
  isVoting?: boolean;
}

function PollDisplay({
  poll,
  postId,
  hasVoted = false,
  userVoteIndex,
  onVote,
  isVoting = false,
}: PollDisplayProps) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const isPollEnded = poll.endDate ? new Date(poll.endDate) < new Date() : false;
  const showResults = hasVoted || isPollEnded;

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Poll question */}
      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <IconChartBar className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
        {poll.question}
      </h4>

      {/* Poll options */}
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const percentage = calculatePercentage(option.votes, totalVotes);
          const isUserVote = userVoteIndex === index;

          if (showResults) {
            // Results view
            return (
              <div
                key={index}
                className={cn(
                  'relative p-3 rounded-lg overflow-hidden',
                  'border',
                  isUserVote
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                )}
              >
                {/* Progress bar */}
                <div
                  className={cn(
                    'absolute inset-0 transition-all duration-500',
                    isUserVote
                      ? 'bg-primary-200/50 dark:bg-primary-800/30'
                      : 'bg-gray-100 dark:bg-gray-800/50'
                  )}
                  style={{ width: `${percentage}%` }}
                />
                
                {/* Content */}
                <div className="relative flex items-center justify-between z-10">
                  <span className={cn(
                    'font-medium',
                    isUserVote
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {option.text}
                    {isUserVote && (
                      <IconCheck className="inline w-4 h-4 ml-2" />
                    )}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          }

          // Voting view
          return (
            <button
              key={index}
              onClick={() => onVote?.(postId, index)}
              disabled={isVoting || isPollEnded}
              className={cn(
                'w-full p-3 rounded-lg text-left',
                'border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-900',
                'hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Poll meta */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        {poll.endDate && (
          <span className="flex items-center gap-1">
            <IconClock className="w-4 h-4" />
            {isPollEnded ? 'Ended' : `Ends ${formatTimestamp(poll.endDate)}`}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * GroupPostCard component
 * 
 * Displays an individual group post with all its elements.
 * 
 * Features:
 * - Pinned indicator
 * - Author info with role badge
 * - Post type badge
 * - Expandable content with "Read more"
 * - Image gallery
 * - Poll display with voting
 * - Action bar (like, comment, share)
 * - More menu (edit, delete, pin)
 * - Approval pending badge
 * - Dark mode support
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostCard({
  post,
  currentUserId: _currentUserId,
  groupId: _groupId,
  currentUserRole,
  isAuthor,
  authorRole,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  onPin,
  onVote,
  maxContentLength = 500,
  className,
}: GroupPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const {
    _id,
    authorInfo,
    content,
    images,
    postType,
    poll,
    isPinned,
    isApproved,
    likesCount,
    commentsCount,
    isLiked,
    isEdited,
    createdAt,
    editedAt: _editedAt,
    tags,
  } = post;

  const typeColors = postTypeColors[postType];
  const authorRoleBadge = authorRole ? roleBadges[authorRole] : null;
  
  // Check if content should be truncated
  const shouldTruncate = content.length > maxContentLength;
  const displayContent = shouldTruncate && !isExpanded
    ? content.slice(0, maxContentLength) + '...'
    : content;

  // Permissions
  const canEdit = isAuthor;
  const canDelete = isAuthor || currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'moderator';
  const canPin = currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'moderator';
  const hasMenuOptions = canEdit || canDelete || canPin;

  // Handle vote
  const handleVote = async (postId: string, optionIndex: number) => {
    if (onVote) {
      setIsVoting(true);
      try {
        await onVote(postId, optionIndex);
      } finally {
        setIsVoting(false);
      }
    }
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow duration-200',
        'hover:shadow-md',
        isPinned && 'ring-2 ring-amber-400 dark:ring-amber-500',
        !isApproved && 'opacity-75',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Pinned indicator */}
        {isPinned && (
          <div className="flex items-center gap-1.5 mb-3 text-amber-600 dark:text-amber-500 text-sm font-medium">
            <IconPinnedFilled className="w-4 h-4" />
            Pinned post
          </div>
        )}

        {/* Pending approval indicator */}
        {!isApproved && (
          <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-sm rounded-lg">
            <IconAlertCircle className="w-4 h-4" />
            Pending approval
          </div>
        )}

        {/* Author header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {authorInfo?.profileImage ? (
              <ResponsiveImage
                src={authorInfo.profileImage}
                alt={authorInfo.fullName}
                containerClassName="w-10 h-10"
                isAvatar
                fallbackComponent={
                  <div className="w-full h-full rounded-full bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-200 dark:ring-primary-800 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {getInitial(authorInfo?.fullName)}
                    </span>
                  </div>
                }
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-200 dark:ring-primary-800 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {getInitial(authorInfo?.fullName)}
                </span>
              </div>
            )}

            {/* Name, role, timestamp */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {authorInfo?.fullName || 'Unknown User'}
                </span>
                
                {/* Role badge */}
                {authorRoleBadge && (
                  <Badge className={cn('flex items-center gap-1 px-1.5 py-0', authorRoleBadge.color)}>
                    {authorRoleBadge.icon}
                    <span className="text-xs">{authorRoleBadge.label}</span>
                  </Badge>
                )}

                {/* Post type badge */}
                <Badge className={cn('flex items-center gap-1', typeColors.bg, typeColors.text)}>
                  {postTypeIcons[postType]}
                  <span className="text-xs">{POST_TYPE_LABELS[postType]}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatTimestamp(createdAt)}</span>
                {isEdited && (
                  <>
                    <span>•</span>
                    <span>Edited</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* More menu */}
          {hasMenuOptions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[36px] min-w-[36px] p-0"
                >
                  <IconDotsVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canPin && (
                  <DropdownMenuItem onClick={() => onPin?.(_id, isPinned)}>
                    {isPinned ? (
                      <>
                        <IconPin className="w-4 h-4 mr-2" />
                        Unpin post
                      </>
                    ) : (
                      <>
                        <IconPinnedFilled className="w-4 h-4 mr-2" />
                        Pin post
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit?.(_id)}>
                    <IconEdit className="w-4 h-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(_id)}
                      className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                    >
                      <IconTrash className="w-4 h-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </p>
          
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  Show less
                  <IconChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Read more
                  <IconChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Image gallery */}
        {images && images.length > 0 && (
          <div className="mb-4 -mx-4 sm:mx-0 sm:rounded-lg overflow-hidden">
            <ImageGallery images={images} altPrefix={`Post by ${authorInfo?.fullName}`} />
          </div>
        )}

        {/* Poll display */}
        {poll && (
          <PollDisplay
            poll={poll}
            postId={_id}
            hasVoted={poll.hasVoted}
            userVoteIndex={poll.userVoteIndex}
            onVote={handleVote}
            isVoting={isVoting}
          />
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            {/* Like button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike?.(_id)}
              className={cn(
                'min-h-[44px] px-3 gap-1.5',
                isLiked && 'text-red-500'
              )}
            >
              {isLiked ? (
                <IconHeartFilled className="w-5 h-5" />
              ) : (
                <IconHeart className="w-5 h-5" />
              )}
              {likesCount > 0 && (
                <span className="text-sm">{formatNumber(likesCount)}</span>
              )}
            </Button>

            {/* Comment button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment?.(_id)}
              className="min-h-[44px] px-3 gap-1.5"
            >
              <IconMessageCircle className="w-5 h-5" />
              {commentsCount > 0 && (
                <span className="text-sm">{formatNumber(commentsCount)}</span>
              )}
            </Button>
          </div>

          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare?.(_id)}
            className="min-h-[44px] px-3"
          >
            <IconShare className="w-5 h-5" />
          </Button>
        </div>

        {/* Helpful comments indicator */}
        {commentsCount > 0 && postType === 'question' && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <IconCheck className="w-4 h-4 text-emerald-500" />
              View helpful answers
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GroupPostCard;
