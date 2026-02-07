/**
 * useFollowing Hook
 * 
 * Fetches and manages a paginated list of users that a user follows
 * with support for infinite scroll and search functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { FollowUser, FollowListResponse } from '@/types/follow';

/**
 * useFollowing hook options
 */
export interface UseFollowingOptions {
  /** Initial page size */
  limit?: number;
  /** Search query to filter following by name */
  searchQuery?: string;
  /** Skip initial fetch */
  skipInitialFetch?: boolean;
  /** Callback when following list is fetched */
  onSuccess?: (following: FollowUser[], total: number) => void;
  /** Callback when fetch fails */
  onError?: (error: string) => void;
}

/**
 * useFollowing hook return type
 */
export interface UseFollowingReturn {
  /** List of users being followed */
  following: FollowUser[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether more data is being loaded */
  isLoadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are more users to load */
  hasMore: boolean;
  /** Total count of following */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Load more following users (for infinite scroll) */
  loadMore: () => Promise<void>;
  /** Refetch from the beginning */
  refetch: () => Promise<void>;
  /** Update a user's follow status (for optimistic updates) */
  updateFollowingStatus: (userPhone: string, updates: Partial<Pick<FollowUser, 'isFollowing' | 'isFollowedBy'>>) => void;
  /** Remove a user from the list (for optimistic unfollow) */
  removeFromFollowing: (userPhone: string) => void;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for fetching paginated following list
 * 
 * Features:
 * - Paginated data loading
 * - Infinite scroll support
 * - Search functionality
 * - Optimistic update support
 * - Remove from list support
 * - Proper error handling
 * 
 * @param userPhone - The phone number of the user whose following list to fetch
 * @param options - Hook configuration options
 * @returns Following list state and actions
 */
export function useFollowing(
  userPhone: string | null | undefined,
  options: UseFollowingOptions = {}
): UseFollowingReturn {
  const {
    limit = 20,
    searchQuery = '',
    skipInitialFetch = false,
    onSuccess,
    onError,
  } = options;

  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const searchQueryRef = useRef(searchQuery);

  /**
   * Fetch following list from API
   */
  const fetchFollowing = useCallback(async (
    pageNum: number,
    append: boolean = false
  ) => {
    if (!userPhone) {
      setIsLoading(false);
      return;
    }

    const authPhone = getAuthPhone();
    const cleanUserPhone = userPhone.replace(/\D/g, '');

    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });

      if (searchQueryRef.current) {
        params.set('search', searchQueryRef.current);
      }

      const response = await axios.get<FollowListResponse>(
        `/api/user/${cleanUserPhone}/following?${params.toString()}`,
        {
          headers: authPhone ? { 'x-user-phone': authPhone } : {},
        }
      );

      const { users, pagination } = response.data;

      if (mountedRef.current) {
        if (append) {
          setFollowing(prev => [...prev, ...users]);
        } else {
          setFollowing(users);
        }
        
        setHasMore(pagination.hasMore);
        setTotalCount(pagination.total);
        setPage(pageNum);
        setError(null);
        
        onSuccess?.(append ? [...following, ...users] : users, pagination.total);
      }
    } catch (err) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to fetch following list';
        
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
      fetchingRef.current = false;
    }
  }, [userPhone, limit, following, onSuccess, onError]);

  /**
   * Load more following users (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || fetchingRef.current) return;
    await fetchFollowing(page + 1, true);
  }, [hasMore, isLoadingMore, page, fetchFollowing]);

  /**
   * Refetch from the beginning
   */
  const refetch = useCallback(async () => {
    setPage(1);
    setFollowing([]);
    await fetchFollowing(1, false);
  }, [fetchFollowing]);

  /**
   * Update a user's follow status (for optimistic updates)
   */
  const updateFollowingStatus = useCallback((
    targetPhone: string,
    updates: Partial<Pick<FollowUser, 'isFollowing' | 'isFollowedBy'>>
  ) => {
    setFollowing(prev => 
      prev.map(user => 
        user.phone === targetPhone
          ? { ...user, ...updates }
          : user
      )
    );
  }, []);

  /**
   * Remove a user from the following list (for optimistic unfollow)
   */
  const removeFromFollowing = useCallback((targetPhone: string) => {
    setFollowing(prev => prev.filter(user => user.phone !== targetPhone));
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

  // Handle search query changes
  useEffect(() => {
    if (searchQueryRef.current !== searchQuery) {
      searchQueryRef.current = searchQuery;
      // Reset and refetch when search changes
      if (userPhone && !skipInitialFetch) {
        setPage(1);
        setFollowing([]);
        fetchFollowing(1, false);
      }
    }
  }, [searchQuery, userPhone, skipInitialFetch, fetchFollowing]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (!skipInitialFetch && userPhone) {
      fetchFollowing(1, false);
    } else if (!userPhone) {
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [userPhone, skipInitialFetch]);

  return {
    following,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refetch,
    updateFollowingStatus,
    removeFromFollowing,
  };
}

export default useFollowing;
