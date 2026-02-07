/**
 * useComments Hook
 * 
 * Manages comments state including fetching, adding, editing,
 * deleting comments, and handling likes and helpful marks.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  fetchComments as apiFetchComments,
  createComment as apiCreateComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
  toggleCommentLike as apiToggleCommentLike,
  markCommentHelpful as apiMarkCommentHelpful,
  type Comment,
  type ApiError,
} from '@/lib/api-client';

/**
 * Standardized error object for consistent error handling
 */
export interface CommentsError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Comments state interface
 */
export interface CommentsState {
  comments: Comment[];
  loading: boolean;
  loadingMore: boolean;
  error: CommentsError | null;
  hasMore: boolean;
  nextCursor: string | null;
  sortBy: 'newest' | 'oldest' | 'helpful';
}

/**
 * useComments hook options
 */
export interface UseCommentsOptions {
  postId: string;
  initialSortBy?: 'newest' | 'oldest' | 'helpful';
  limit?: number;
  autoFetch?: boolean;
}

/**
 * useComments hook return type
 */
export interface UseCommentsReturn {
  // State
  comments: Comment[];
  loading: boolean;
  loadingMore: boolean;
  error: CommentsError | null;
  hasMore: boolean;
  sortBy: 'newest' | 'oldest' | 'helpful';
  
  // Actions
  fetchComments: () => Promise<void>;
  fetchMore: () => Promise<void>;
  addComment: (content: string, parentCommentId?: string) => Promise<Comment | null>;
  editComment: (commentId: string, content: string) => Promise<Comment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
  toggleCommentLike: (commentId: string, currentLiked: boolean, currentCount: number) => Promise<boolean>;
  markHelpful: (commentId: string) => Promise<Comment | null>;
  setSortBy: (sort: 'newest' | 'oldest' | 'helpful') => void;
  
  // Error handling
  clearError: () => void;
  retry: () => Promise<void>;
  
  // Utilities
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  removeComment: (commentId: string) => void;
}

/**
 * Custom hook for managing comments with full CRUD functionality
 * 
 * Features:
 * - Cursor-based pagination
 * - Multiple sort options (newest, oldest, helpful)
 * - Nested replies support
 * - Optimistic updates for likes
 * - Edit and delete functionality
 * 
 * @param options - Hook configuration options
 * @returns Comments state and actions
 */
export function useComments(options: UseCommentsOptions): UseCommentsReturn {
  const {
    postId,
    initialSortBy = 'newest',
    limit = 10,
    autoFetch = false,
  } = options;

  // State
  const [state, setState] = useState<CommentsState>({
    comments: [],
    loading: false,
    loadingMore: false,
    error: null,
    hasMore: true,
    nextCursor: null,
    sortBy: initialSortBy,
  });

  // Refs
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const initialFetchDone = useRef(false);
  // Store state in refs for stable callback
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Fetch comments from API
   */
  const fetchCommentsInternal = useCallback(async (
    isLoadMore: boolean = false
  ): Promise<void> => {
    if (isFetchingRef.current) return;
    const currentState = stateRef.current;
    if (isLoadMore && !currentState.hasMore) return;

    isFetchingRef.current = true;

    setState(prev => ({
      ...prev,
      loading: !isLoadMore,
      loadingMore: isLoadMore,
      error: null,
    }));

    try {
      const response = await apiFetchComments(postId, {
        limit,
        sortBy: currentState.sortBy,
        cursor: isLoadMore ? (currentState.nextCursor || undefined) : undefined,
        includeReplies: true,
      });

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        comments: isLoadMore 
          ? [...prev.comments, ...response.data]
          : response.data,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        loading: false,
        loadingMore: false,
      }));
    } catch (err) {
      if (!mountedRef.current) return;

      const apiError = err as ApiError;
      const errorMessage = apiError.error || 'Failed to load comments';
      const errorCode = apiError.statusCode?.toString();
      
      setState(prev => ({
        ...prev,
        error: {
          message: errorMessage,
          code: errorCode,
          retryable: true,
        },
        loading: false,
        loadingMore: false,
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [postId, limit]); // Stable dependencies only

  /**
   * Fetch comments (public method)
   */
  const fetchComments = useCallback(async (): Promise<void> => {
    // Reset state and fetch fresh
    setState(prev => ({
      ...prev,
      comments: [],
      hasMore: true,
      nextCursor: null,
    }));
    await fetchCommentsInternal(false);
  }, [fetchCommentsInternal]);

  /**
   * Fetch more comments for pagination
   */
  const fetchMore = useCallback(async (): Promise<void> => {
    await fetchCommentsInternal(true);
  }, [fetchCommentsInternal]);

  /**
   * Add a new comment
   */
  const addComment = useCallback(async (
    content: string,
    parentCommentId?: string
  ): Promise<Comment | null> => {
    try {
      const response = await apiCreateComment(postId, {
        content,
        parentCommentId,
      });

      if (!mountedRef.current) return null;

      const newComment = response.data;

      // Add to comments list
      if (parentCommentId) {
        // Add as reply to parent comment
        setState(prev => ({
          ...prev,
          comments: prev.comments.map(comment => {
            if (comment._id === parentCommentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
                repliesCount: (comment.repliesCount || 0) + 1,
              };
            }
            return comment;
          }),
        }));
      } else {
        // Add as top-level comment
        setState(prev => ({
          ...prev,
          comments: prev.sortBy === 'newest' 
            ? [newComment, ...prev.comments]
            : [...prev.comments, newComment],
        }));
      }

      return newComment;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      setState(prev => ({
        ...prev,
        error: {
          message: apiError.error || 'Failed to add comment',
          code: apiError.statusCode?.toString(),
          retryable: false,
        },
      }));
      return null;
    }
  }, [postId]);

  /**
   * Edit an existing comment
   */
  const editComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<Comment | null> => {
    try {
      const response = await apiUpdateComment(postId, commentId, { content });

      if (!mountedRef.current) return null;

      const updatedComment = response.data;

      // Update in state
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment => {
          if (comment._id === commentId) {
            return updatedComment;
          }
          // Check replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply._id === commentId ? updatedComment : reply
              ),
            };
          }
          return comment;
        }),
      }));

      return updatedComment;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      setState(prev => ({
        ...prev,
        error: {
          message: apiError.error || 'Failed to edit comment',
          code: apiError.statusCode?.toString(),
          retryable: false,
        },
      }));
      return null;
    }
  }, [postId]);

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    try {
      await apiDeleteComment(postId, commentId);

      if (!mountedRef.current) return false;

      // Remove from state
      setState(prev => ({
        ...prev,
        comments: prev.comments
          .filter(comment => comment._id !== commentId)
          .map(comment => ({
            ...comment,
            replies: comment.replies?.filter(reply => reply._id !== commentId),
            repliesCount: comment.replies?.some(reply => reply._id === commentId)
              ? (comment.repliesCount || 1) - 1
              : comment.repliesCount,
          })),
      }));

      return true;
    } catch (err) {
      if (!mountedRef.current) return false;

      const apiError = err as ApiError;
      setState(prev => ({
        ...prev,
        error: {
          message: apiError.error || 'Failed to delete comment',
          code: apiError.statusCode?.toString(),
          retryable: false,
        },
      }));
      return false;
    }
  }, [postId]);

  /**
   * Toggle like on a comment with optimistic update
   */
  const toggleCommentLike = useCallback(async (
    commentId: string,
    currentLiked: boolean,
    currentCount: number
  ): Promise<boolean> => {
    // Optimistic update
    const optimisticLiked = !currentLiked;
    const optimisticCount = optimisticLiked 
      ? currentCount + 1 
      : Math.max(0, currentCount - 1);

    const updateCommentLikeState = (
      comments: Comment[],
      liked: boolean,
      count: number
    ): Comment[] => {
      return comments.map(comment => {
        if (comment._id === commentId) {
          return { ...comment, isLiked: liked, likesCount: count };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply._id === commentId
                ? { ...reply, isLiked: liked, likesCount: count }
                : reply
            ),
          };
        }
        return comment;
      });
    };

    // Apply optimistic update
    setState(prev => ({
      ...prev,
      comments: updateCommentLikeState(prev.comments, optimisticLiked, optimisticCount),
    }));

    try {
      const response = await apiToggleCommentLike(postId, commentId);

      if (!mountedRef.current) return optimisticLiked;

      // Update with actual values
      setState(prev => ({
        ...prev,
        comments: updateCommentLikeState(prev.comments, response.liked, response.likesCount),
      }));

      return response.liked;
    } catch (err) {
      if (!mountedRef.current) return currentLiked;

      // Rollback
      setState(prev => ({
        ...prev,
        comments: updateCommentLikeState(prev.comments, currentLiked, currentCount),
        error: {
          message: (err as ApiError).error || 'Failed to update like',
          code: (err as ApiError).statusCode?.toString(),
          retryable: false,
        },
      }));

      return currentLiked;
    }
  }, [postId]);

  /**
   * Mark a comment as helpful (post author only)
   */
  const markHelpful = useCallback(async (commentId: string): Promise<Comment | null> => {
    try {
      const response = await apiMarkCommentHelpful(postId, commentId);

      if (!mountedRef.current) return null;

      const updatedComment = response.data;

      // Update in state
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment => {
          if (comment._id === commentId) {
            return updatedComment;
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply._id === commentId ? updatedComment : reply
              ),
            };
          }
          return comment;
        }),
      }));

      return updatedComment;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      setState(prev => ({
        ...prev,
        error: {
          message: apiError.error || 'Failed to mark comment as helpful',
          code: apiError.statusCode?.toString(),
          retryable: false,
        },
      }));
      return null;
    }
  }, [postId]);

  /**
   * Set sort order and refresh comments
   */
  const setSortBy = useCallback((sort: 'newest' | 'oldest' | 'helpful'): void => {
    setState(prev => ({
      ...prev,
      sortBy: sort,
      comments: [],
      hasMore: true,
      nextCursor: null,
    }));
  }, []);

  /**
   * Update a comment locally (utility method)
   */
  const updateComment = useCallback((commentId: string, updates: Partial<Comment>): void => {
    setState(prev => ({
      ...prev,
      comments: prev.comments.map(comment => {
        if (comment._id === commentId) {
          return { ...comment, ...updates };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply._id === commentId ? { ...reply, ...updates } : reply
            ),
          };
        }
        return comment;
      }),
    }));
  }, []);

  /**
   * Remove a comment locally (utility method)
   */
  const removeComment = useCallback((commentId: string): void => {
    setState(prev => ({
      ...prev,
      comments: prev.comments
        .filter(comment => comment._id !== commentId)
        .map(comment => ({
          ...comment,
          replies: comment.replies?.filter(reply => reply._id !== commentId),
        })),
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Retry failed fetch - clears error and refetches
   */
  const retry = useCallback(async (): Promise<void> => {
    clearError();
    await fetchCommentsInternal(false);
  }, [clearError, fetchCommentsInternal]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-fetch when sortBy changes
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchCommentsInternal(false);
    }
  }, [autoFetch]);

  return {
    // State
    comments: state.comments,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.hasMore,
    sortBy: state.sortBy,
    
    // Actions
    fetchComments,
    fetchMore,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    markHelpful,
    setSortBy,
    
    // Error handling
    clearError,
    retry,
    
    // Utilities
    updateComment,
    removeComment,
  };
}

export default useComments;
