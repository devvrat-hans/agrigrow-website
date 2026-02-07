/**
 * useFollowers Hook
 * 
 * Fetches and manages a paginated list of followers for a user
 * with support for infinite scroll and search functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { FollowUser, FollowListResponse } from '@/types/follow';

/**
 * useFollowers hook options
 */
export interface UseFollowersOptions {
  /** Initial page size */
  limit?: number;
  /** Search query to filter followers by name */
  searchQuery?: string;
  /** Skip initial fetch */
  skipInitialFetch?: boolean;
  /** Callback when followers are fetched */
  onSuccess?: (followers: FollowUser[], total: number) => void;
  /** Callback when fetch fails */
  onError?: (error: string) => void;
}

/**
 * useFollowers hook return type
 */
export interface UseFollowersReturn {
  /** List of followers */
  followers: FollowUser[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether more data is being loaded */
  isLoadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are more followers to load */
  hasMore: boolean;
  /** Total count of followers */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Load more followers (for infinite scroll) */
  loadMore: () => Promise<void>;
  /** Refetch from the beginning */
  refetch: () => Promise<void>;
  /** Update a follower's follow status (for optimistic updates) */
  updateFollowerStatus: (userPhone: string, updates: Partial<Pick<FollowUser, 'isFollowing' | 'isFollowedBy'>>) => void;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for fetching paginated followers list
 * 
 * Features:
 * - Paginated data loading
 * - Infinite scroll support
 * - Search functionality
 * - Optimistic update support
 * - Proper error handling
 * 
 * @param userPhone - The phone number of the user whose followers to fetch
 * @param options - Hook configuration options
 * @returns Followers list state and actions
 */
export function useFollowers(
  userPhone: string | null | undefined,
  options: UseFollowersOptions = {}
): UseFollowersReturn {
  const {
    limit = 20,
    searchQuery = '',
    skipInitialFetch = false,
    onSuccess,
    onError,
  } = options;

  const [followers, setFollowers] = useState<FollowUser[]>([]);
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
   * Fetch followers from API
   */
  const fetchFollowers = useCallback(async (
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
        `/api/user/${cleanUserPhone}/followers?${params.toString()}`,
        {
          headers: authPhone ? { 'x-user-phone': authPhone } : {},
        }
      );

      const { users, pagination } = response.data;

      if (mountedRef.current) {
        if (append) {
          setFollowers(prev => [...prev, ...users]);
        } else {
          setFollowers(users);
        }
        
        setHasMore(pagination.hasMore);
        setTotalCount(pagination.total);
        setPage(pageNum);
        setError(null);
        
        onSuccess?.(append ? [...followers, ...users] : users, pagination.total);
      }
    } catch (err) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to fetch followers';
        
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
  }, [userPhone, limit, followers, onSuccess, onError]);

  /**
   * Load more followers (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || fetchingRef.current) return;
    await fetchFollowers(page + 1, true);
  }, [hasMore, isLoadingMore, page, fetchFollowers]);

  /**
   * Refetch from the beginning
   */
  const refetch = useCallback(async () => {
    setPage(1);
    setFollowers([]);
    await fetchFollowers(1, false);
  }, [fetchFollowers]);

  /**
   * Update a follower's follow status (for optimistic updates)
   */
  const updateFollowerStatus = useCallback((
    targetPhone: string,
    updates: Partial<Pick<FollowUser, 'isFollowing' | 'isFollowedBy'>>
  ) => {
    setFollowers(prev => 
      prev.map(follower => 
        follower.phone === targetPhone
          ? { ...follower, ...updates }
          : follower
      )
    );
  }, []);

  // Handle search query changes
  useEffect(() => {
    if (searchQueryRef.current !== searchQuery) {
      searchQueryRef.current = searchQuery;
      // Reset and refetch when search changes
      if (userPhone && !skipInitialFetch) {
        setPage(1);
        setFollowers([]);
        fetchFollowers(1, false);
      }
    }
  }, [searchQuery, userPhone, skipInitialFetch, fetchFollowers]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (!skipInitialFetch && userPhone) {
      fetchFollowers(1, false);
    } else if (!userPhone) {
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [userPhone, skipInitialFetch]);

  return {
    followers,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refetch,
    updateFollowerStatus,
  };
}

export default useFollowers;
