/**
 * useFollowStatus Hook
 * 
 * Fetches and caches the follow relationship status between
 * the current user and a target user.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { FollowStatusResponse } from '@/types/follow';

/**
 * useFollowStatus hook options
 */
export interface UseFollowStatusOptions {
  /** Skip initial fetch (useful for conditional loading) */
  skipInitialFetch?: boolean;
  /** Callback when status is fetched */
  onSuccess?: (status: FollowStatusResponse) => void;
  /** Callback when fetch fails */
  onError?: (error: string) => void;
}

/**
 * useFollowStatus hook return type
 */
export interface UseFollowStatusReturn {
  /** Whether current user is following the target user */
  isFollowing: boolean;
  /** Whether target user is following current user */
  isFollowedBy: boolean;
  /** Whether there's a pending follow request */
  isPending: boolean;
  /** Whether the user is blocked */
  isBlocked: boolean;
  /** Whether this is checking self status */
  isSelf: boolean;
  /** Whether the status is currently loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Target user's privacy setting */
  targetUser: {
    phone: string;
    fullName: string;
    isPrivateAccount: boolean;
  } | null;
  /** Refetch the follow status */
  refetch: () => Promise<void>;
  /** Manually set the follow status (for optimistic updates) */
  setFollowStatus: (updates: Partial<Pick<UseFollowStatusReturn, 'isFollowing' | 'isPending'>>) => void;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Cache for follow status to reduce API calls
 */
const statusCache = new Map<string, {
  data: FollowStatusResponse & { targetUser?: { phone: string; fullName: string; isPrivateAccount: boolean } };
  timestamp: number;
}>();

const CACHE_TTL = 30000; // 30 seconds

/**
 * Custom hook for fetching and caching follow relationship status
 * 
 * Features:
 * - Automatic fetching on mount
 * - In-memory caching with TTL
 * - Refetch capability
 * - Optimistic update support
 * - Proper error handling
 * 
 * @param userPhone - The phone number of the user to check status for
 * @param options - Hook configuration options
 * @returns Follow status state and actions
 */
export function useFollowStatus(
  userPhone: string | null | undefined,
  options: UseFollowStatusOptions = {}
): UseFollowStatusReturn {
  const { skipInitialFetch = false, onSuccess, onError } = options;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<{
    phone: string;
    fullName: string;
    isPrivateAccount: boolean;
  } | null>(null);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  /**
   * Fetch follow status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!userPhone) {
      setIsLoading(false);
      return;
    }

    const authPhone = getAuthPhone();
    if (!authPhone) {
      setIsLoading(false);
      setError('Please sign in to view follow status');
      return;
    }

    // Check if same user
    const cleanAuthPhone = authPhone.replace(/\D/g, '');
    const cleanUserPhone = userPhone.replace(/\D/g, '');
    
    if (cleanAuthPhone === cleanUserPhone) {
      if (mountedRef.current) {
        setIsSelf(true);
        setIsFollowing(false);
        setIsFollowedBy(false);
        setIsPending(false);
        setIsBlocked(false);
        setIsLoading(false);
      }
      return;
    }

    // Check cache
    const cached = statusCache.get(cleanUserPhone);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (mountedRef.current) {
        setIsFollowing(cached.data.isFollowing);
        setIsFollowedBy(cached.data.isFollowedBy);
        setIsPending(cached.data.isPending);
        setIsBlocked(cached.data.isBlocked);
        setIsSelf(false);
        setTargetUser(cached.data.targetUser || null);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get<FollowStatusResponse & {
        isSelf?: boolean;
        targetUser?: { phone: string; fullName: string; isPrivateAccount: boolean };
      }>(
        `/api/user/${cleanUserPhone}/follow-status`,
        {
          headers: {
            'x-user-phone': authPhone,
          },
        }
      );

      const data = response.data;

      // Update cache
      statusCache.set(cleanUserPhone, {
        data: data,
        timestamp: Date.now(),
      });

      if (mountedRef.current) {
        setIsFollowing(data.isFollowing);
        setIsFollowedBy(data.isFollowedBy);
        setIsPending(data.isPending);
        setIsBlocked(data.isBlocked);
        setIsSelf(data.isSelf || false);
        setTargetUser(data.targetUser || null);
        setIsLoading(false);
        setError(null);
        onSuccess?.(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to fetch follow status';
        
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [userPhone, onSuccess, onError]);

  /**
   * Refetch the follow status (bypasses cache)
   */
  const refetch = useCallback(async () => {
    if (userPhone) {
      const cleanUserPhone = userPhone.replace(/\D/g, '');
      statusCache.delete(cleanUserPhone);
    }
    await fetchStatus();
  }, [userPhone, fetchStatus]);

  /**
   * Manually set follow status (for optimistic updates)
   */
  const setFollowStatus = useCallback((
    updates: Partial<Pick<UseFollowStatusReturn, 'isFollowing' | 'isPending'>>
  ) => {
    if (updates.isFollowing !== undefined) {
      setIsFollowing(updates.isFollowing);
    }
    if (updates.isPending !== undefined) {
      setIsPending(updates.isPending);
    }

    // Update cache with new values
    if (userPhone) {
      const cleanUserPhone = userPhone.replace(/\D/g, '');
      const cached = statusCache.get(cleanUserPhone);
      if (cached) {
        statusCache.set(cleanUserPhone, {
          data: {
            ...cached.data,
            ...(updates.isFollowing !== undefined && { isFollowing: updates.isFollowing }),
            ...(updates.isPending !== undefined && { isPending: updates.isPending }),
          },
          timestamp: cached.timestamp,
        });
      }
    }
  }, [userPhone]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (!skipInitialFetch && userPhone) {
      fetchStatus();
    } else if (!userPhone) {
      setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [userPhone, skipInitialFetch, fetchStatus]);

  return {
    isFollowing,
    isFollowedBy,
    isPending,
    isBlocked,
    isSelf,
    isLoading,
    error,
    targetUser,
    refetch,
    setFollowStatus,
  };
}

export default useFollowStatus;

/**
 * Clear the follow status cache
 */
export function clearFollowStatusCache(userPhone?: string): void {
  if (userPhone) {
    const cleanUserPhone = userPhone.replace(/\D/g, '');
    statusCache.delete(cleanUserPhone);
  } else {
    statusCache.clear();
  }
}
