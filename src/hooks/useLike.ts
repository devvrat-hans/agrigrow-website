/**
 * useLike Hook
 * 
 * Provides like functionality with optimistic UI updates,
 * automatic rollback on error, and local state management.
 */

import { useState, useCallback, useRef } from 'react';
import { toggleLike as apiToggleLike, type LikeResponse, type ApiError } from '@/lib/api-client';

/**
 * Like state for a single post
 */
export interface LikeState {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Multiple likes state (keyed by post ID)
 */
export type LikesMap = Map<string, LikeState>;

/**
 * useLike hook options
 */
export interface UseLikeOptions {
  /** Callback when like succeeds */
  onSuccess?: (postId: string, liked: boolean, likesCount: number) => void;
  /** Callback when like fails */
  onError?: (postId: string, error: string) => void;
}

/**
 * useLike hook return type
 */
export interface UseLikeReturn {
  /** Toggle like on a post */
  toggleLike: (postId: string, currentLiked: boolean, currentCount: number) => Promise<LikeResponse | null>;
  /** Check if a post like action is loading */
  isLiking: (postId: string) => boolean;
  /** Get like state for a post */
  getLikeState: (postId: string) => LikeState | undefined;
  /** Get error for a post */
  getError: (postId: string) => string | null;
  /** Clear error for a post */
  clearError: (postId: string) => void;
}

/**
 * Custom hook for like functionality with optimistic updates
 * 
 * Features:
 * - Optimistic UI updates for immediate feedback
 * - Automatic rollback on API error
 * - Debouncing to prevent rapid toggles
 * - Per-post loading and error states
 * 
 * @param options - Hook configuration options
 * @returns Like actions and state getters
 */
export function useLike(options: UseLikeOptions = {}): UseLikeReturn {
  const { onSuccess, onError } = options;

  // State map for tracking likes by post ID
  const [likesMap, setLikesMap] = useState<LikesMap>(new Map());
  
  // Ref to track pending requests (for debouncing)
  const pendingRequests = useRef<Set<string>>(new Set());
  
  // Ref for mounted state
  const mountedRef = useRef(true);

  /**
   * Update like state for a specific post
   */
  const updateLikeState = useCallback((
    postId: string,
    updates: Partial<LikeState>
  ): void => {
    setLikesMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(postId) || {
        isLiked: false,
        likesCount: 0,
        isLoading: false,
        error: null,
      };
      newMap.set(postId, { ...current, ...updates });
      return newMap;
    });
  }, []);

  /**
   * Toggle like on a post with optimistic update
   */
  const toggleLike = useCallback(async (
    postId: string,
    currentLiked: boolean,
    currentCount: number
  ): Promise<LikeResponse | null> => {
    // Prevent duplicate requests
    if (pendingRequests.current.has(postId)) {
      return null;
    }

    // Calculate optimistic values
    const optimisticLiked = !currentLiked;
    const optimisticCount = optimisticLiked 
      ? currentCount + 1 
      : Math.max(0, currentCount - 1);

    // Store original values for rollback
    const originalLiked = currentLiked;
    const originalCount = currentCount;

    // Mark request as pending
    pendingRequests.current.add(postId);

    // Apply optimistic update
    updateLikeState(postId, {
      isLiked: optimisticLiked,
      likesCount: optimisticCount,
      isLoading: true,
      error: null,
    });

    try {
      // Call API
      const response = await apiToggleLike(postId);

      if (!mountedRef.current) return null;

      // Update with actual server values
      updateLikeState(postId, {
        isLiked: response.liked,
        likesCount: response.likesCount,
        isLoading: false,
        error: null,
      });

      // Call success callback
      onSuccess?.(postId, response.liked, response.likesCount);

      return response;
    } catch (err) {
      if (!mountedRef.current) return null;

      const apiError = err as ApiError;
      const errorMessage = apiError.error || 'Failed to update like';

      // Rollback to original values
      updateLikeState(postId, {
        isLiked: originalLiked,
        likesCount: originalCount,
        isLoading: false,
        error: errorMessage,
      });

      // Call error callback
      onError?.(postId, errorMessage);

      return null;
    } finally {
      // Remove from pending requests
      pendingRequests.current.delete(postId);
    }
  }, [updateLikeState, onSuccess, onError]);

  /**
   * Check if a post like action is loading
   */
  const isLiking = useCallback((postId: string): boolean => {
    return likesMap.get(postId)?.isLoading || false;
  }, [likesMap]);

  /**
   * Get like state for a post
   */
  const getLikeState = useCallback((postId: string): LikeState | undefined => {
    return likesMap.get(postId);
  }, [likesMap]);

  /**
   * Get error for a post
   */
  const getError = useCallback((postId: string): string | null => {
    return likesMap.get(postId)?.error || null;
  }, [likesMap]);

  /**
   * Clear error for a post
   */
  const clearError = useCallback((postId: string): void => {
    updateLikeState(postId, { error: null });
  }, [updateLikeState]);

  return {
    toggleLike,
    isLiking,
    getLikeState,
    getError,
    clearError,
  };
}

/**
 * Simple hook for single post like state
 * Useful when you only need to track one post
 */
export function useSingleLike(
  initialLiked: boolean = false,
  initialCount: number = 0,
  options: UseLikeOptions = {}
) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pendingRef = useRef(false);

  const toggleLike = useCallback(async (postId: string): Promise<boolean> => {
    if (pendingRef.current) return isLiked;
    
    pendingRef.current = true;
    setIsLoading(true);
    setError(null);

    // Optimistic update
    const originalLiked = isLiked;
    const originalCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(prev => !isLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const response = await apiToggleLike(postId);
      setIsLiked(response.liked);
      setLikesCount(response.likesCount);
      options.onSuccess?.(postId, response.liked, response.likesCount);
      return response.liked;
    } catch (err) {
      // Rollback
      setIsLiked(originalLiked);
      setLikesCount(originalCount);
      const errorMsg = (err as ApiError).error || 'Failed to update like';
      setError(errorMsg);
      options.onError?.(postId, errorMsg);
      return originalLiked;
    } finally {
      pendingRef.current = false;
      setIsLoading(false);
    }
  }, [isLiked, likesCount, options]);

  const reset = useCallback((liked: boolean, count: number) => {
    setIsLiked(liked);
    setLikesCount(count);
    setError(null);
  }, []);

  return {
    isLiked,
    likesCount,
    isLoading,
    error,
    toggleLike,
    reset,
    clearError: () => setError(null),
  };
}

export default useLike;
