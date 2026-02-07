'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  IconMessageCircle,
  IconLoader2,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentItem, type CommentData } from './CommentItem';
import { CommentInput } from './CommentInput';
import { useComments } from '@/hooks/useComments';
import { useTranslation } from '@/hooks/useTranslation';
import { trackRender } from '@/lib/performance';

/**
 * User info for avatar display
 */
interface UserInfo {
  _id?: string;
  fullName?: string;
  profileImage?: string;
}

/**
 * Props for CommentSection component
 */
interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
  currentUser?: UserInfo;
  initialExpanded?: boolean;
  commentsCount?: number;
  className?: string;
}

/**
 * CommentSection Component
 * Complete comment system with list, input, pagination, and sorting
 */
function CommentSectionComponent({
  postId,
  postAuthorId,
  currentUser,
  initialExpanded = false,
  commentsCount = 0,
  className,
}: CommentSectionProps) {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('CommentSection');
  }
  
  const { t } = useTranslation();

  /**
   * Sort option labels (translated)
   */
  const SORT_OPTIONS: Record<'newest' | 'oldest' | 'helpful', string> = {
    newest: t('feed.comments.newestFirst'),
    oldest: t('feed.comments.oldestFirst'),
    helpful: t('feed.comments.mostHelpful'),
  };
  
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const hasFetchedRef = React.useRef(false);

  // Sync isExpanded with initialExpanded prop changes
  useEffect(() => {
    if (initialExpanded && !isExpanded) {
      setIsExpanded(true);
    }
  }, [initialExpanded]);

  // Use comments hook
  const {
    comments,
    loading,
    loadingMore,
    error,
    hasMore,
    sortBy,
    fetchComments,
    fetchMore,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    markHelpful,
    setSortBy,
    clearError,
  } = useComments({
    postId,
    initialSortBy: 'newest',
    limit: 10,
    autoFetch: false,
  });

  // Fetch comments when expanded (only once)
  useEffect(() => {
    if (isExpanded && !hasFetchedRef.current && !loading) {
      hasFetchedRef.current = true;
      fetchComments();
    }
  }, [isExpanded]);

  /**
   * Handle toggle expand/collapse
   */
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Handle new comment submission
   */
  const handleAddComment = useCallback(
    async (content: string) => {
      const result = await addComment(content);
      return result;
    },
    [addComment]
  );

  /**
   * Handle reply submission
   */
  const handleAddReply = useCallback(
    async (parentCommentId: string, content: string) => {
      const result = await addComment(content, parentCommentId);
      if (result) {
        setReplyingTo(null);
      }
      return result;
    },
    [addComment]
  );

  /**
   * Handle like toggle
   */
  const handleLike = useCallback(
    async (commentId: string, isLiked: boolean, count: number) => {
      return toggleCommentLike(commentId, isLiked, count);
    },
    [toggleCommentLike]
  );

  /**
   * Handle edit comment
   */
  const handleEdit = useCallback(
    async (commentId: string, content: string) => {
      return editComment(commentId, content);
    },
    [editComment]
  );

  /**
   * Handle delete comment
   */
  const handleDelete = useCallback(
    async (commentId: string) => {
      return deleteComment(commentId);
    },
    [deleteComment]
  );

  /**
   * Handle mark helpful
   */
  const handleMarkHelpful = useCallback(
    async (commentId: string) => {
      return markHelpful(commentId);
    },
    [markHelpful]
  );

  /**
   * Handle sort change
   */
  const handleSortChange = (sort: 'newest' | 'oldest' | 'helpful') => {
    setSortBy(sort);
    fetchComments();
  };

  /**
   * Get reply input for a comment
   */
  const getReplyInput = (commentId: string) => {
    if (replyingTo !== commentId) return null;

    return (
      <CommentInput
        user={currentUser}
        placeholder={t('feed.comments.writeReply')}
        isReply
        autoFocus
        onSubmit={(content) => handleAddReply(commentId, content)}
        onCancel={() => setReplyingTo(null)}
      />
    );
  };

  // Actual displayed comment count
  const displayCount = commentsCount > 0 ? commentsCount : comments.length;

  return (
    <div className={cn(
      'border-t border-gray-100 dark:border-gray-800',
      // Subtle border radius for the section
      'rounded-b-lg',
      className
    )}>
      {/* Header with toggle and count - responsive padding and touch target */}
      <button
        onClick={handleToggleExpand}
        className={cn(
          'w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3',
          // Minimum touch target height
          'min-h-[44px]',
          'text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors'
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <IconMessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span>
            {displayCount} {displayCount === 1 ? t('feed.comments.comment') : t('feed.comments.commentsPlural')}
          </span>
        </div>
        {isExpanded ? (
          <IconChevronUp size={18} />
        ) : (
          <IconChevronDown size={18} />
        )}
      </button>

      {/* Expanded content - responsive padding */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <IconAlertCircle
                size={16}
                className="flex-shrink-0 mt-0.5 text-red-500"
              />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
                <button
                  onClick={clearError}
                  className="text-xs text-red-600 dark:text-red-400 underline mt-1"
                >
                  {t('feed.comments.dismiss')}
                </button>
              </div>
            </div>
          )}

          {/* New comment input */}
          {currentUser && (
            <CommentInput
              user={currentUser}
              placeholder={t('feed.comments.writeComment')}
              onSubmit={handleAddComment}
            />
          )}

          {/* Sort dropdown */}
          {comments.length > 1 && (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-gray-500"
                  >
                    <IconFilter size={14} className="mr-1" />
                    {SORT_OPTIONS[sortBy]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {(Object.keys(SORT_OPTIONS) as Array<keyof typeof SORT_OPTIONS>).map(
                    (option) => (
                      <DropdownMenuItem
                        key={option}
                        onClick={() => handleSortChange(option)}
                        className={cn(
                          sortBy === option && 'bg-primary-50 dark:bg-primary-950'
                        )}
                      >
                        {SORT_OPTIONS[option]}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Loading state */}
          {loading && comments.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={24} className="animate-spin text-primary-500" />
            </div>
          )}

          {/* Comments list */}
          {!loading && comments.length === 0 && (
            <div className="text-center py-8">
              <IconMessageCircle
                size={32}
                className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('feed.comments.noComments')} {t('feed.comments.beFirstToComment')}
              </p>
            </div>
          )}

          {comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment as unknown as CommentData}
                  postAuthorId={postAuthorId}
                  currentUserId={currentUser?._id}
                  onLike={handleLike}
                  onReply={(commentId) => {
                    setReplyingTo(commentId);
                  }}
                  onMarkHelpful={handleMarkHelpful}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  replyInputComponent={getReplyInput(comment._id)}
                />
              ))}
            </div>
          )}

          {/* Load more button */}
          {hasMore && comments.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <IconLoader2 size={14} className="mr-1 animate-spin" />
                    {t('feed.comments.loading')}
                  </>
                ) : (
                  t('feed.comments.loadMore')
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Memoized CommentSection for performance
 */
export const CommentSection = memo(CommentSectionComponent, (prevProps, nextProps) => {
  return (
    prevProps.postId === nextProps.postId &&
    prevProps.postAuthorId === nextProps.postAuthorId &&
    prevProps.currentUser?._id === nextProps.currentUser?._id &&
    prevProps.initialExpanded === nextProps.initialExpanded &&
    prevProps.commentsCount === nextProps.commentsCount &&
    prevProps.className === nextProps.className
  );
});

export default CommentSection;
