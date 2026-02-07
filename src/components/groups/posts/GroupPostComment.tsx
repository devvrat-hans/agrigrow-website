'use client';

import React from 'react';
import {
  IconHeart,
  IconHeartFilled,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCheck,
  IconShieldCheck,
  IconCrown,
  IconCornerDownRight,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GroupCommentData,
  MemberRole,
} from '@/types/group';

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
  member: null,
};

/**
 * GroupPostComment component props
 */
interface GroupPostCommentProps {
  /** Comment data */
  comment: GroupCommentData;
  /** Post author ID */
  postAuthorId: string;
  /** Current user ID */
  currentUserId?: string;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Author's role in the group */
  authorRole?: MemberRole;
  /** Callback when like is clicked */
  onLike?: (commentId: string) => void;
  /** Callback when reply is clicked */
  onReply?: (commentId: string) => void;
  /** Callback when edit is clicked */
  onEdit?: (commentId: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (commentId: string) => void;
  /** Callback when mark helpful is clicked */
  onMarkHelpful?: (commentId: string) => void;
  /** Render nested replies */
  renderReplies?: (parentId: string) => React.ReactNode;
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
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get first letter for avatar fallback
 */
function getInitial(name?: string): string {
  return name?.charAt(0).toUpperCase() || 'U';
}

/**
 * Format number with abbreviation
 */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * GroupPostComment component
 * 
 * Displays an individual comment with nested replies support.
 * 
 * Features:
 * - Author avatar (smaller for replies)
 * - Name, role badge, timestamp
 * - Comment content
 * - Helpful badge (if marked by post author)
 * - Action row: like, reply, more menu
 * - Nested replies with connecting line
 * - Edit/delete options for author
 * - Mark helpful option for post author
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostComment({
  comment,
  postAuthorId,
  currentUserId,
  currentUserRole,
  authorRole,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onMarkHelpful,
  renderReplies,
  className,
}: GroupPostCommentProps) {
  const {
    _id,
    authorInfo,
    content,
    depth,
    likesCount,
    isLiked,
    isHelpful,
    isEdited,
    createdAt,
  } = comment;

  const isAuthor = currentUserId === comment.author;
  const isPostAuthor = currentUserId === postAuthorId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'moderator';
  const canMarkHelpful = isPostAuthor && !isHelpful;
  const canReply = depth < 2;
  const hasMenuOptions = canEdit || canDelete || canMarkHelpful;

  const authorRoleBadge = authorRole ? roleBadges[authorRole] : null;
  const isReply = depth > 0;
  const avatarSize = isReply ? 'w-7 h-7' : 'w-9 h-9';
  const avatarTextSize = isReply ? 'text-xs' : 'text-sm';

  return (
    <div
      className={cn(
        'relative',
        isReply && 'ml-10 pl-4',
        className
      )}
    >
      {/* Connecting line for replies */}
      {isReply && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        {authorInfo?.profileImage ? (
          <img
            src={authorInfo.profileImage}
            alt={authorInfo.fullName}
            className={cn(avatarSize, 'rounded-full object-cover flex-shrink-0')}
          />
        ) : (
          <div
            className={cn(
              avatarSize,
              'rounded-full bg-primary-100 dark:bg-primary-900/50',
              'flex items-center justify-center flex-shrink-0'
            )}
          >
            <span className={cn(avatarTextSize, 'font-medium text-primary-700 dark:text-primary-300')}>
              {getInitial(authorInfo?.fullName)}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {authorInfo?.fullName || 'Unknown User'}
            </span>
            
            {/* Role badge */}
            {authorRoleBadge && (
              <Badge className={cn('flex items-center gap-0.5 px-1 py-0 text-[10px]', authorRoleBadge.color)}>
                {authorRoleBadge.icon}
                {authorRoleBadge.label}
              </Badge>
            )}

            {/* Post author indicator */}
            {comment.author === postAuthorId && !authorRoleBadge && (
              <Badge variant="outline" className="px-1 py-0 text-[10px]">
                OP
              </Badge>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400">
              · {formatTimestamp(createdAt)}
              {isEdited && ' · Edited'}
            </span>
          </div>

          {/* Helpful badge */}
          {isHelpful && (
            <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
              <IconCheck className="w-3 h-3" />
              Helpful
            </div>
          )}

          {/* Content */}
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 mt-2">
            {/* Like button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike?.(_id)}
              className={cn(
                'h-8 px-2 gap-1 text-xs',
                isLiked && 'text-red-500'
              )}
            >
              {isLiked ? (
                <IconHeartFilled className="w-4 h-4" />
              ) : (
                <IconHeart className="w-4 h-4" />
              )}
              {likesCount > 0 && formatNumber(likesCount)}
            </Button>

            {/* Reply button */}
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply?.(_id)}
                className="h-8 px-2 gap-1 text-xs"
              >
                <IconCornerDownRight className="w-4 h-4" />
                Reply
              </Button>
            )}

            {/* More menu */}
            {hasMenuOptions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <IconDotsVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canMarkHelpful && (
                    <DropdownMenuItem onClick={() => onMarkHelpful?.(_id)}>
                      <IconCheck className="w-4 h-4 mr-2" />
                      Mark as helpful
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit?.(_id)}>
                      <IconEdit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      {(canMarkHelpful || canEdit) && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => onDelete?.(_id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <IconTrash className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {renderReplies && renderReplies(_id)}
    </div>
  );
}

export default GroupPostComment;
