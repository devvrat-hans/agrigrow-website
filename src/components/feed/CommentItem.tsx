'use client';

import React, { useState, useCallback, memo } from 'react';
import { trackRender } from '@/lib/performance';
import Link from 'next/link';
import {
  IconHeart,
  IconHeartFilled,
  IconMessageReply,
  IconCheck,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconFlag,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportModal } from './ReportModal';

/**
 * Comment author interface
 */
export interface CommentAuthor {
  _id: string;
  fullName: string;
  profileImage?: string;
  role?: string;
}

/**
 * Comment data interface
 */
export interface CommentData {
  _id: string;
  content: string;
  author: CommentAuthor;
  createdAt: string | Date;
  updatedAt?: string | Date;
  isEdited?: boolean;
  likesCount: number;
  isLiked?: boolean;
  isHelpful?: boolean;
  repliesCount?: number;
  replies?: CommentData[];
  parentComment?: string;
}

/**
 * Props for CommentItem component
 */
interface CommentItemProps {
  comment: CommentData;
  postAuthorId: string;
  currentUserId?: string;
  isReply?: boolean;
  onLike?: (commentId: string, isLiked: boolean, count: number) => Promise<boolean>;
  onReply?: (commentId: string) => void;
  onMarkHelpful?: (commentId: string) => Promise<unknown>;
  onEdit?: (commentId: string, content: string) => Promise<unknown>;
  onDelete?: (commentId: string) => Promise<boolean>;
  replyInputComponent?: React.ReactNode;
  className?: string;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w`;
  return then.toLocaleDateString();
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
 * CommentItem Component
 * Displays a single comment with all interactions and nested replies
 */
function CommentItemComponent({
  comment,
  postAuthorId,
  currentUserId,
  isReply = false,
  onLike,
  onReply,
  onMarkHelpful,
  onEdit,
  onDelete,
  replyInputComponent,
  className,
}: CommentItemProps) {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('CommentItem');
  }
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingHelpful, setIsMarkingHelpful] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Check permissions
  const isCommentAuthor = currentUserId === comment.author._id;
  const isPostAuthor = currentUserId === postAuthorId;

  // Get replies to display
  const visibleReplies = showAllReplies
    ? comment.replies || []
    : (comment.replies || []).slice(0, 2);
  const hiddenRepliesCount = (comment.replies?.length || 0) - 2;

  /**
   * Handle like toggle
   */
  const handleLike = useCallback(async () => {
    if (isLiking || !onLike) return;
    setIsLiking(true);
    try {
      await onLike(comment._id, comment.isLiked || false, comment.likesCount);
    } finally {
      setIsLiking(false);
    }
  }, [comment._id, comment.isLiked, comment.likesCount, isLiking, onLike]);

  /**
   * Handle reply button click
   */
  const handleReplyClick = () => {
    const newShowReply = !showReplyInput;
    setShowReplyInput(newShowReply);
    // Notify parent to set replyingTo state — this makes replyInputComponent render
    if (newShowReply && onReply) {
      onReply(comment._id);
    }
  };

  /**
   * Handle mark as helpful
   */
  const handleMarkHelpful = useCallback(async () => {
    if (isMarkingHelpful || !onMarkHelpful || !isPostAuthor) return;
    setIsMarkingHelpful(true);
    try {
      await onMarkHelpful(comment._id);
    } finally {
      setIsMarkingHelpful(false);
    }
  }, [comment._id, isMarkingHelpful, isPostAuthor, onMarkHelpful]);

  /**
   * Handle edit submit
   */
  const handleEditSubmit = useCallback(async () => {
    if (isSaving || !onEdit || !editContent.trim()) return;
    setIsSaving(true);
    try {
      await onEdit(comment._id, editContent.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [comment._id, editContent, isSaving, onEdit]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback(async () => {
    if (isDeleting || !onDelete) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;
    setIsDeleting(true);
    try {
      await onDelete(comment._id);
    } finally {
      setIsDeleting(false);
    }
  }, [comment._id, isDeleting, onDelete]);

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'relative',
        // Responsive nested comment indent - smaller on mobile
        isReply && 'pl-6 sm:pl-8 border-l-2 border-gray-200 dark:border-gray-700 ml-8 sm:ml-10',
        className
      )}
    >
      {/* Header row with avatar and author info - similar to FeedItemCard */}
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Author Avatar - responsive sizing */}
        <Link 
          href={`/profile/${comment.author._id}`} 
          className="flex-shrink-0 flex items-center"
        >
          {comment.author.profileImage ? (
            <img
              src={comment.author.profileImage}
              alt={comment.author.fullName}
              className={cn(
                'rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600',
                // Responsive avatar sizes
                isReply ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
              )}
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded-full',
                'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400',
                'text-xs font-medium border-2 border-primary-200 dark:border-primary-700',
                // Responsive avatar sizes
                isReply ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
              )}
            >
              {getInitials(comment.author.fullName)}
            </div>
          )}
        </Link>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Author info and content */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 sm:px-3 py-2">
            {/* Author name row - matching FeedItemCard pattern */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-hidden h-5">
              <Link
                href={`/profile/${comment.author._id}`}
                className="font-medium text-xs sm:text-sm hover:underline truncate inline-flex items-center"
              >
                {comment.author.fullName}
              </Link>
              {comment.author.role && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 capitalize flex-shrink-0 inline-flex items-center h-4"
                >
                  {comment.author.role}
                </Badge>
              )}
              {comment.isHelpful && (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 inline-flex items-center h-4">
                  <IconCheck size={10} className="mr-0.5" />
                  Helpful
                </Badge>
              )}
            </div>

            {/* Edit mode or display content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-sm rounded border resize-none',
                    'border-gray-300 dark:border-gray-600',
                    'bg-white dark:bg-gray-950',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500'
                  )}
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleEditSubmit}
                    disabled={isSaving || !editContent.trim()}
                  >
                    {isSaving ? (
                      <IconLoader2 size={14} className="animate-spin mr-1" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Actions row - responsive spacing with 44px touch targets */}
          <div className="flex items-center gap-1 sm:gap-3 mt-1">
            {/* Like button - 44px touch target */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                'flex items-center gap-1 text-xs font-medium transition-colors',
                // Minimum touch target
                'min-h-[44px] px-2',
                comment.isLiked
                  ? 'text-red-500'
                  : 'text-gray-500 hover:text-red-500',
                // Make reply like buttons more prominent
                isReply && !comment.isLiked && 'text-gray-600 dark:text-gray-400',
                isReply && comment.isLiked && 'text-red-500'
              )}
            >
              {isLiking ? (
                <IconLoader2 size={isReply ? 15 : 14} className="animate-spin" />
              ) : comment.isLiked ? (
                <IconHeartFilled size={isReply ? 15 : 14} />
              ) : (
                <IconHeart size={isReply ? 15 : 14} />
              )}
              {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
            </button>

            {/* Reply button - 44px touch target */}
            {!isReply && (
              <button
                onClick={handleReplyClick}
                className={cn(
                  'flex items-center gap-1 text-xs text-gray-500 hover:text-primary-500 transition-colors',
                  // Minimum touch target
                  'min-h-[44px] px-2'
                )}
              >
                <IconMessageReply size={14} />
                Reply
              </button>
            )}

            {/* Mark as helpful (only for post author, not on own comments) - 44px touch target */}
            {isPostAuthor && !isCommentAuthor && !comment.isHelpful && onMarkHelpful && (
              <button
                onClick={handleMarkHelpful}
                disabled={isMarkingHelpful}
                className={cn(
                  'flex items-center gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors',
                  // Minimum touch target
                  'min-h-[44px] px-2'
                )}
              >
                {isMarkingHelpful ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconCheck size={14} />
                )}
                Helpful
              </button>
            )}

            {/* Timestamp */}
            <span className="text-xs text-gray-400 hidden sm:inline">
              {formatRelativeTime(comment.createdAt)}
              {comment.isEdited && ' (edited)'}
            </span>

            {/* More options dropdown - 44px touch target */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <IconDotsVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {/* Edit option - only for comment author */}
                {isCommentAuthor && onEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <IconPencil size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {/* Delete option - only for comment author */}
                {isCommentAuthor && onDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-500 focus:text-red-500"
                  >
                    {isDeleting ? (
                      <IconLoader2 size={14} className="mr-2 animate-spin" />
                    ) : (
                      <IconTrash size={14} className="mr-2" />
                    )}
                    Delete
                  </DropdownMenuItem>
                )}
                {/* Separator if there are author options */}
                {isCommentAuthor && (onEdit || onDelete) && (
                  <DropdownMenuSeparator />
                )}
                {/* Report option - available to everyone except comment author */}
                {!isCommentAuthor && (
                  <DropdownMenuItem
                    onClick={() => setIsReportModalOpen(true)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <IconFlag size={14} className="mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reply input */}
          {showReplyInput && replyInputComponent}

          {/* Report Modal */}
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            itemType="comment"
            itemId={comment._id}
          />

          {/* Nested replies */}
          {visibleReplies.length > 0 && (
            <div className="mt-3 space-y-3">
              {visibleReplies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  postAuthorId={postAuthorId}
                  currentUserId={currentUserId}
                  isReply
                  onLike={onLike}
                  onMarkHelpful={onMarkHelpful}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}

              {/* Show more replies button */}
              {!showAllReplies && hiddenRepliesCount > 0 && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-10"
                >
                  Show {hiddenRepliesCount} more{' '}
                  {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison function for React.memo
 * Only re-render if critical props change
 */
function commentItemPropsAreEqual(
  prevProps: CommentItemProps,
  nextProps: CommentItemProps
): boolean {
  const prevComment = prevProps.comment;
  const nextComment = nextProps.comment;
  
  // Compare comment identity
  if (prevComment._id !== nextComment._id) {
    return false;
  }
  
  // Compare mutable comment properties
  if (
    prevComment.content !== nextComment.content ||
    prevComment.likesCount !== nextComment.likesCount ||
    prevComment.isLiked !== nextComment.isLiked ||
    prevComment.isHelpful !== nextComment.isHelpful ||
    prevComment.isEdited !== nextComment.isEdited ||
    prevComment.repliesCount !== nextComment.repliesCount
  ) {
    return false;
  }
  
  // Compare replies array length (shallow)
  if ((prevComment.replies?.length || 0) !== (nextComment.replies?.length || 0)) {
    return false;
  }
  
  // Compare context props
  if (
    prevProps.postAuthorId !== nextProps.postAuthorId ||
    prevProps.currentUserId !== nextProps.currentUserId ||
    prevProps.isReply !== nextProps.isReply ||
    prevProps.className !== nextProps.className
  ) {
    return false;
  }

  // Compare replyInputComponent presence — when the user clicks Reply,
  // the parent passes a non-null component; we must re-render to show it.
  if (!!prevProps.replyInputComponent !== !!nextProps.replyInputComponent) {
    return false;
  }
  
  return true;
}

/**
 * Memoized CommentItem for performance
 */
export const CommentItem = memo(CommentItemComponent, commentItemPropsAreEqual);

export default CommentItem;
