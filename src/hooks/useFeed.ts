/**
 * useFeed Hook
 * 
 * Manages feed state for the home feed with infinite scroll support,
 * cursor-based pagination, personalized sorting, and in-memory caching.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  fetchFeed,
  type Post,
  type PaginatedResponse,
  type ApiError,
} from '@/lib/api-client';
import { feedCache, cacheKeys, trackRender } from '@/lib/performance';
import type { PostType } from '@/models/Post';

/**
 * Standardized error object for consistent error handling
 */
export interface FeedError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Feed state interface
 */
export interface FeedState {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: FeedError | null;
  hasMore: boolean;
  nextCursor: string | null;
  category: PostType | null;
  crop: string | null;
}

/**
 * Feed hook options
 */
export interface UseFeedOptions {
  initialCategory?: PostType;
  initialCrop?: string;
  limit?: number;
  sortBy?: 'newest' | 'engagement';
  autoFetch?: boolean;
  /** Enable in-memory caching for better performance */
  enableCache?: boolean;
  /** Cache TTL in milliseconds (default: 2 minutes) */
  cacheTTL?: number;
}

/**
 * Feed hook return type
 */
export interface UseFeedReturn {
  // State
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: FeedError | null;
  hasMore: boolean;
  
  // Actions
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setCategory: (category: PostType | null) => void;
  setCrop: (crop: string | null) => void;
  
  // Error handling
  clearError: () => void;
  retry: () => Promise<void>;
  
  // Utilities
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  prependPost: (post: Post) => void;
}

/**
 * Custom hook for managing the home feed with infinite scroll
 * 
 * Features:
 * - Cursor-based pagination for efficient loading
 * - Category and crop filtering
 * - Pull-to-refresh support
 * - Optimistic UI updates for post mutations
 * - In-memory caching for improved performance
 * 
 * @param options - Hook configuration options
 * @returns Feed state and actions
 */
export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('useFeed');
  }

  const {
    initialCategory = null,
    initialCrop = null,
    limit = 10,
    sortBy = 'newest',
    autoFetch = true,
    enableCache = true,
    cacheTTL = 2 * 60 * 1000, // 2 minutes default
  } = options;

  /**
   * Generate cache key based on current filters
   */
  const getCacheKey = useCallback((category: PostType | null, crop: string | null) => {
    return cacheKeys.feed(
      category || 'all', 
      1, 
      limit, 
      sortBy, 
      crop || undefined
    );
  }, [limit, sortBy]);

  // State
  const [state, setState] = useState<FeedState>({
    posts: [],
    loading: false,
    refreshing: false,
    error: null,
    hasMore: true,
    nextCursor: null,
    category: initialCategory,
    crop: initialCrop,
  });

  // Refs for preventing duplicate requests
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Fetch posts from API with caching support
   */
  const fetchPosts = useCallback(async (
    isRefresh: boolean = false,
    cursor?: string | null
  ): Promise<void> => {
    // Prevent duplicate requests
    if (isFetchingRef.current) return;
    
    // Don't fetch if no more posts and not refreshing
    if (!isRefresh && !state.hasMore && state.posts.length > 0) return;

    isFetchingRef.current = true;

    // Check cache for initial load (not refresh, no cursor)
    const cacheKey = getCacheKey(state.category, state.crop);
    if (enableCache && !isRefresh && !cursor) {
      const cachedData = feedCache.get<PaginatedResponse<Post>>(cacheKey);
      if (cachedData) {
        setState(prev => ({
          ...prev,
          posts: cachedData.data,
          hasMore: cachedData.hasMore,
          nextCursor: cachedData.nextCursor,
          loading: false,
          refreshing: false,
        }));
        isFetchingRef.current = false;
        return;
      }
    }

    setState(prev => ({
      ...prev,
      loading: !isRefresh,
      refreshing: isRefresh,
      error: null,
    }));

    try {
      const response: PaginatedResponse<Post> = await fetchFeed({
        limit,
        category: state.category || undefined,
        crop: state.crop || undefined,
        cursor: isRefresh ? undefined : (cursor || undefined),
        sortBy,
      });

      if (!mountedRef.current) return;

      // Cache the initial page response
      if (enableCache && (isRefresh || !cursor)) {
        feedCache.set(cacheKey, response, cacheTTL);
      }

      setState(prev => ({
        ...prev,
        posts: isRefresh 
          ? response.data 
          : [...prev.posts, ...response.data],
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        loading: false,
        refreshing: false,
      }));
    } catch (err) {
      if (!mountedRef.current) return;

      const apiError = err as ApiError;
      const errorMessage = apiError.error || 'Failed to load posts';
      const errorCode = apiError.statusCode?.toString();
      
      setState(prev => ({
        ...prev,
        error: {
          message: errorMessage,
          code: errorCode,
          retryable: true,
        },
        loading: false,
        refreshing: false,
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [limit, sortBy, state.category, state.crop, state.hasMore, state.posts.length, enableCache, cacheTTL, getCacheKey]);

  /**
   * Fetch more posts for infinite scroll
   */
  const fetchMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.loading || state.refreshing) return;
    await fetchPosts(false, state.nextCursor);
  }, [fetchPosts, state.hasMore, state.loading, state.refreshing, state.nextCursor]);

  /**
   * Refresh the feed (pull-to-refresh)
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (state.refreshing) return;
    await fetchPosts(true);
  }, [fetchPosts, state.refreshing]);

  /**
   * Set category filter and refresh feed (invalidates cache)
   */
  const setCategory = useCallback((category: PostType | null): void => {
    setState(prev => ({
      ...prev,
      category,
      posts: [],
      hasMore: true,
      nextCursor: null,
    }));
  }, []);

  /**
   * Set crop filter and refresh feed (invalidates cache)
   */
  const setCrop = useCallback((crop: string | null): void => {
    setState(prev => ({
      ...prev,
      crop,
      posts: [],
      hasMore: true,
      nextCursor: null,
    }));
  }, []);

  /**
   * Invalidate all feed caches (useful after mutations)
   */
  const _invalidateCache = useCallback((): void => {
    feedCache.invalidatePattern('feed:');
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Retry failed fetch - clears error and refetches
   */
  const retry = useCallback(async (): Promise<void> => {
    clearError();
    await fetchPosts(true);
  }, [clearError, fetchPosts]);

  /**
   * Update a specific post in the feed (optimistic updates)
   * Also invalidates relevant cache entries
   */
  const updatePost = useCallback((postId: string, updates: Partial<Post>): void => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.map(post =>
        post._id === postId ? { ...post, ...updates } : post
      ),
    }));
    // Invalidate individual post cache
    feedCache.delete(cacheKeys.post(postId));
  }, []);

  /**
   * Remove a post from the feed and invalidate cache
   */
  const removePost = useCallback((postId: string): void => {
    setState(prev => ({
      ...prev,
      posts: prev.posts.filter(post => post._id !== postId),
    }));
    // Invalidate caches
    feedCache.delete(cacheKeys.post(postId));
    feedCache.invalidatePattern('feed:');
  }, []);

  /**
   * Add a new post to the beginning of the feed and invalidate cache
   */
  const prependPost = useCallback((post: Post): void => {
    setState(prev => ({
      ...prev,
      posts: [post, ...prev.posts],
    }));
    // Invalidate feed cache since order changed
    feedCache.invalidatePattern('feed:');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      // Use false (not refresh) to allow cache hits on remount
      fetchPosts(false);
    }
  }, [autoFetch]);

  // Refetch when category or crop changes
  useEffect(() => {
    if (autoFetch && initialFetchDone.current) {
      fetchPosts(true);
    }
  }, [state.category, state.crop]);

  return {
    // State
    posts: state.posts,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    hasMore: state.hasMore,
    
    // Actions
    fetchMore,
    refresh,
    setCategory,
    setCrop,
    
    // Error handling
    clearError,
    retry,
    
    // Utilities
    updatePost,
    removePost,
    prependPost,
  };
}

export default useFeed;
