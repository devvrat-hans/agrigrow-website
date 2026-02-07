'use client';

import React, { useState, useMemo } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GroupPostComment } from './GroupPostComment';
import { GroupCommentInput } from './GroupCommentInput';
import { GroupCommentData, MemberRole } from '@/types/group';

/**
 * GroupCommentList component props
 */
interface GroupCommentListProps {
  /** List of comments */
  comments: GroupCommentData[];
  /** Post ID */
  postId: string;
  /** Post author ID */
  postAuthorId: string;
  /** Current user ID */
  currentUserId?: string;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Current user avatar */
  userAvatar?: string;
  /** Current user name */
  userName?: string;
  /** Map of user IDs to roles */
  memberRoles?: Record<string, MemberRole>;
  /** Whether there are more comments to load */
  hasMore?: boolean;
  /** Whether comments are loading */
  isLoading?: boolean;
  /** Callback when load more is clicked */
  onLoadMore?: () => void;
  /** Callback when a comment is liked */
  onLike?: (commentId: string) => void;
  /** Callback when a comment is added */
  onAddComment?: (content: string, parentId?: string) => Promise<void>;
  /** Callback when a comment is edited */
  onEdit?: (commentId: string) => void;
  /** Callback when a comment is deleted */
  onDelete?: (commentId: string) => void;
  /** Callback when a comment is marked helpful */
  onMarkHelpful?: (commentId: string) => void;
  /** Mention suggestions for comment input */
  mentionSuggestions?: Array<{ id: string; name: string; avatar?: string }>;
  /** Callback to fetch mention suggestions */
  onMentionSearch?: (query: string) => void;
  /** Maximum number of replies to show initially */
  initialRepliesVisible?: number;
  /** Maximum thread depth to show initially */
  initialDepthVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Comment thread component
 */
interface CommentThreadProps {
  comment: GroupCommentData;
  allComments: GroupCommentData[];
  postAuthorId: string;
  currentUserId?: string;
  currentUserRole?: MemberRole;
  userAvatar?: string;
  userName?: string;
  memberRoles?: Record<string, MemberRole>;
  onLike?: (commentId: string) => void;
  onAddComment?: (content: string, parentId?: string) => Promise<void>;
  onEdit?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onMarkHelpful?: (commentId: string) => void;
  mentionSuggestions?: Array<{ id: string; name: string; avatar?: string }>;
  onMentionSearch?: (query: string) => void;
  initialRepliesVisible: number;
  depth?: number;
}

function CommentThread({
  comment,
  allComments,
  postAuthorId,
  currentUserId,
  currentUserRole,
  userAvatar,
  userName,
  memberRoles,
  onLike,
  onAddComment,
  onEdit,
  onDelete,
  onMarkHelpful,
  mentionSuggestions,
  onMentionSearch,
  initialRepliesVisible,
  depth = 0,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Get direct replies to this comment
  const replies = useMemo(() => {
    return allComments.filter((c) => c.parentId === comment._id);
  }, [allComments, comment._id]);

  const visibleReplies = showAllReplies
    ? replies
    : replies.slice(0, initialRepliesVisible);
  const hiddenRepliesCount = replies.length - initialRepliesVisible;

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleSubmitReply = async (content: string) => {
    if (onAddComment) {
      await onAddComment(content, comment._id);
      setReplyingTo(null);
    }
  };

  const authorRole = memberRoles?.[comment.author];

  return (
    <div className="relative">
      <GroupPostComment
        comment={comment}
        postAuthorId={postAuthorId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        authorRole={authorRole}
        onLike={onLike}
        onReply={handleReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onMarkHelpful={onMarkHelpful}
      />

      {/* Reply input */}
      {replyingTo === comment._id && (
        <div className="ml-12 mt-3">
          <GroupCommentInput
            userAvatar={userAvatar}
            userName={userName}
            placeholder={`Reply to ${comment.authorInfo?.fullName || 'this comment'}...`}
            isReply
            parentId={comment._id}
            onSubmit={handleSubmitReply}
            onCancel={() => setReplyingTo(null)}
            mentionSuggestions={mentionSuggestions}
            onMentionSearch={onMentionSearch}
            autoFocus
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-3">
          {/* Collapse/expand button for threads with many replies */}
          {replies.length > 2 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 ml-10 mb-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {isExpanded ? (
                <>
                  <IconChevronUp className="w-4 h-4" />
                  Hide replies
                </>
              ) : (
                <>
                  <IconChevronDown className="w-4 h-4" />
                  Show {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </>
              )}
            </button>
          )}

          {isExpanded && (
            <div className="space-y-3">
              {visibleReplies.map((reply) => (
                <CommentThread
                  key={reply._id}
                  comment={reply}
                  allComments={allComments}
                  postAuthorId={postAuthorId}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  userAvatar={userAvatar}
                  userName={userName}
                  memberRoles={memberRoles}
                  onLike={onLike}
                  onAddComment={onAddComment}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMarkHelpful={onMarkHelpful}
                  mentionSuggestions={mentionSuggestions}
                  onMentionSearch={onMentionSearch}
                  initialRepliesVisible={initialRepliesVisible}
                  depth={depth + 1}
                />
              ))}

              {/* Load more replies button */}
              {hiddenRepliesCount > 0 && !showAllReplies && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  className="ml-10 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Show {hiddenRepliesCount} more {hiddenRepliesCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * GroupCommentList component
 * 
 * Threaded comment display with nested replies.
 * 
 * Features:
 * - Threaded comment display
 * - Collapse/expand for long threads
 * - Load more replies button
 * - Reply functionality
 * - Like, edit, delete actions
 * - Mark as helpful (for post authors)
 * - Loading state
 * - Empty state
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupCommentList({
  comments,
  postId: _postId,
  postAuthorId,
  currentUserId,
  currentUserRole,
  userAvatar,
  userName,
  memberRoles,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onLike,
  onAddComment,
  onEdit,
  onDelete,
  onMarkHelpful,
  mentionSuggestions,
  onMentionSearch,
  initialRepliesVisible = 3,
  initialDepthVisible: _initialDepthVisible = 2,
  className,
}: GroupCommentListProps) {
  // Get top-level comments (no parent)
  const topLevelComments = useMemo(() => {
    return comments.filter((c) => c.parentId === null);
  }, [comments]);

  // Empty state
  if (!isLoading && topLevelComments.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to comment!
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Comments list */}
      {topLevelComments.map((comment) => (
        <CommentThread
          key={comment._id}
          comment={comment}
          allComments={comments}
          postAuthorId={postAuthorId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          userAvatar={userAvatar}
          userName={userName}
          memberRoles={memberRoles}
          onLike={onLike}
          onAddComment={onAddComment}
          onEdit={onEdit}
          onDelete={onDelete}
          onMarkHelpful={onMarkHelpful}
          mentionSuggestions={mentionSuggestions}
          onMentionSearch={onMentionSearch}
          initialRepliesVisible={initialRepliesVisible}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <IconLoader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
          >
            <IconChevronDown className="w-4 h-4 mr-2" />
            Load more comments
          </Button>
        </div>
      )}
    </div>
  );
}

export default GroupCommentList;
