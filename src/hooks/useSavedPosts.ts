'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';
import type { FeedItemData } from '@/components/feed/FeedItemCard';

/**
 * Standardized error object for consistent error handling
 */
export interface SavedPostsError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Pagination state for saved posts
 */
interface SavedPostsPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * API response structure for saved posts
 */
interface SavedPostsResponse {
  success: boolean;
  posts: FeedItemData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Toggle save response
 */
interface ToggleSaveResponse {
  success: boolean;
  isSaved: boolean;
  message: string;
}

/**
 * Options for useSavedPosts hook
 */
interface UseSavedPostsOptions {
  /** Initial page size (default: 20) */
  pageSize?: number;
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

/**
 * Return type for useSavedPosts hook
 */
interface UseSavedPostsReturn {
  /** Array of saved posts */
  savedPosts: FeedItemData[];
  /** Set of saved post IDs for quick lookup */
  savedPostIds: Set<string>;
  /** Whether initial fetch is loading */
  isLoading: boolean;
  /** Whether more posts are loading */
  isLoadingMore: boolean;
  /** Error object if any */
  error: SavedPostsError | null;
  /** Pagination state */
  pagination: SavedPostsPagination;
  /** Fetch saved posts (first page or refresh) */
  fetchSavedPosts: () => Promise<void>;
  /** Load more saved posts (next page) */
  loadMore: () => Promise<void>;
  /** Toggle save status for a post */
  toggleSave: (postId: string) => Promise<{ isSaved: boolean; message: string } | null>;
  /** Check if a post is saved */
  isPostSaved: (postId: string) => boolean;
  /** Refresh saved posts (alias for fetchSavedPosts) */
  refresh: () => Promise<void>;
  /** Whether a specific toggle save operation is in progress */
  isTogglingMap: Map<string, boolean>;
  /** Clear error state */
  clearError: () => void;
  /** Retry failed fetch */
  retry: () => Promise<void>;
}

/**
 * useSavedPosts Hook
 * Manages saved/bookmarked posts state and operations
 */
export function useSavedPosts(options: UseSavedPostsOptions = {}): UseSavedPostsReturn {
  const {
    pageSize = 20,
    autoFetch = true,
  } = options;

  // State
  const [savedPosts, setSavedPosts] = useState<FeedItemData[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<SavedPostsError | null>(null);
  const [pagination, setPagination] = useState<SavedPostsPagination>({
    page: 1,
    limit: pageSize,
    total: 0,
    hasMore: false,
  });
  const [isTogglingMap, setIsTogglingMap] = useState<Map<string, boolean>>(new Map());

  // Refs
  const isMountedRef = useRef(true);

  /**
   * Fetch saved posts from API
   */
  const fetchSavedPosts = useCallback(async (page = 1, append = false) => {
    if (!append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await apiClient.get<SavedPostsResponse>('/user/saved-posts', {
        params: {
          page,
          limit: pageSize,
        },
      });

      if (!isMountedRef.current) return;

      const data = response.data;
      if (data.success) {
        const { posts, pagination: paginationData } = data;

        if (append) {
          setSavedPosts((prev) => [...prev, ...posts]);
          // Add new post IDs to the set
          setSavedPostIds((prev) => {
            const newSet = new Set(prev);
            posts.forEach((post: FeedItemData) => newSet.add(post._id || post.id));
            return newSet;
          });
        } else {
          setSavedPosts(posts);
          // Create new set with all post IDs
          setSavedPostIds(new Set(posts.map((post: FeedItemData) => post._id || post.id)));
        }

        setPagination({
          page: paginationData.page,
          limit: paginationData.limit,
          total: paginationData.total,
          hasMore: paginationData.page < paginationData.totalPages,
        });
      } else {
        throw new Error('Failed to fetch saved posts');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to load saved posts';
      setError({
        message: errorMessage,
        retryable: true,
      });
      console.error('Error fetching saved posts:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [pageSize]);

  /**
   * Load more saved posts (next page)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !pagination.hasMore) return;
    await fetchSavedPosts(pagination.page + 1, true);
  }, [fetchSavedPosts, isLoadingMore, pagination.hasMore, pagination.page]);

  /**
   * Toggle save status for a post
   */
  const toggleSave = useCallback(async (postId: string): Promise<{ isSaved: boolean; message: string } | null> => {
    // Mark as toggling
    setIsTogglingMap((prev) => new Map(prev).set(postId, true));

    try {
      const response = await apiClient.post<ToggleSaveResponse>(`/posts/${postId}/save`);
      const data = response.data;

      if (data.success) {
        // Update local state
        if (data.isSaved) {
          // Post was saved - add to set (we'd need the full post data to add to savedPosts list)
          setSavedPostIds((prev) => new Set(prev).add(postId));
        } else {
          // Post was unsaved - remove from set and list
          setSavedPostIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
          setSavedPosts((prev) => prev.filter((post) => post._id !== postId));
          // Decrease total count
          setPagination((prev) => ({
            ...prev,
            total: Math.max(0, prev.total - 1),
          }));
        }

        return {
          isSaved: data.isSaved,
          message: data.message,
        };
      }

      return null;
    } catch (err) {
      console.error('Error toggling save status:', err);
      return null;
    } finally {
      // Remove from toggling map
      setIsTogglingMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(postId);
        return newMap;
      });
    }
  }, []);

  /**
   * Check if a post is saved
   */
  const isPostSaved = useCallback((postId: string): boolean => {
    return savedPostIds.has(postId);
  }, [savedPostIds]);

  /**
   * Refresh saved posts (alias for fetchSavedPosts)
   */
  const refresh = useCallback(async () => {
    await fetchSavedPosts(1, false);
  }, [fetchSavedPosts]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry failed fetch - clears error and refetches
   */
  const retry = useCallback(async () => {
    clearError();
    await fetchSavedPosts(1, false);
  }, [clearError, fetchSavedPosts]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchSavedPosts(1, false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, fetchSavedPosts]);

  return {
    savedPosts,
    savedPostIds,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    fetchSavedPosts: refresh,
    loadMore,
    toggleSave,
    isPostSaved,
    refresh,
    isTogglingMap,
    clearError,
    retry,
  };
}

export default useSavedPosts;
