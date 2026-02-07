/**
 * useFollowRequests Hook
 * 
 * Manages pending follow requests for private account users
 * with support for accepting/rejecting requests and optimistic updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { FollowRequest, FollowRequestsResponse, HandleFollowRequestResponse } from '@/types/follow';

/**
 * useFollowRequests hook options
 */
export interface UseFollowRequestsOptions {
  /** Initial page size */
  limit?: number;
  /** Skip initial fetch */
  skipInitialFetch?: boolean;
  /** Callback when requests are fetched */
  onFetchSuccess?: (requests: FollowRequest[], total: number) => void;
  /** Callback when fetch fails */
  onFetchError?: (error: string) => void;
  /** Callback when request is accepted */
  onAcceptSuccess?: (requestId: string) => void;
  /** Callback when accept fails */
  onAcceptError?: (requestId: string, error: string) => void;
  /** Callback when request is rejected */
  onRejectSuccess?: (requestId: string) => void;
  /** Callback when reject fails */
  onRejectError?: (requestId: string, error: string) => void;
}

/**
 * useFollowRequests hook return type
 */
export interface UseFollowRequestsReturn {
  /** List of pending follow requests */
  requests: FollowRequest[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether more data is being loaded */
  isLoadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are more requests to load */
  hasMore: boolean;
  /** Total count of pending requests */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Set of request IDs currently being processed */
  processingIds: Set<string>;
  /** Load more requests (for infinite scroll) */
  loadMore: () => Promise<void>;
  /** Refetch from the beginning */
  refetch: () => Promise<void>;
  /** Accept a follow request */
  acceptRequest: (requestId: string) => Promise<boolean>;
  /** Reject a follow request */
  rejectRequest: (requestId: string) => Promise<boolean>;
  /** Check if a request is being processed */
  isProcessing: (requestId: string) => boolean;
}

/**
 * Get auth phone from localStorage
 */
function getAuthPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for managing pending follow requests
 * 
 * Features:
 * - Paginated data loading
 * - Accept/Reject with optimistic updates
 * - Processing state tracking
 * - Automatic rollback on error
 * - Proper error handling
 * 
 * @param options - Hook configuration options
 * @returns Follow requests state and actions
 */
export function useFollowRequests(
  options: UseFollowRequestsOptions = {}
): UseFollowRequestsReturn {
  const {
    limit = 20,
    skipInitialFetch = false,
    onFetchSuccess,
    onFetchError,
    onAcceptSuccess,
    onAcceptError,
    onRejectSuccess,
    onRejectError,
  } = options;

  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  /**
   * Add request ID to processing set
   */
  const addProcessing = useCallback((id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
  }, []);

  /**
   * Remove request ID from processing set
   */
  const removeProcessing = useCallback((id: string) => {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  /**
   * Fetch follow requests from API
   */
  const fetchRequests = useCallback(async (
    pageNum: number,
    append: boolean = false
  ) => {
    const authPhone = getAuthPhone();
    
    if (!authPhone) {
      setIsLoading(false);
      setError('Please sign in to view follow requests');
      return;
    }

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

      const response = await axios.get<FollowRequestsResponse>(
        `/api/user/follow-requests?${params.toString()}`,
        {
          headers: { 'x-user-phone': authPhone },
        }
      );

      const { requests: fetchedRequests, pagination } = response.data;

      if (mountedRef.current) {
        if (append) {
          setRequests(prev => [...prev, ...fetchedRequests]);
        } else {
          setRequests(fetchedRequests);
        }
        
        setHasMore(pagination.hasMore);
        setTotalCount(pagination.total);
        setPage(pageNum);
        setError(null);
        
        onFetchSuccess?.(
          append ? [...requests, ...fetchedRequests] : fetchedRequests,
          pagination.total
        );
      }
    } catch (err) {
      if (mountedRef.current) {
        let errorMessage = 'Failed to fetch follow requests';
        
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        setError(errorMessage);
        onFetchError?.(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
      fetchingRef.current = false;
    }
  }, [limit, requests, onFetchSuccess, onFetchError]);

  /**
   * Load more requests (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || fetchingRef.current) return;
    await fetchRequests(page + 1, true);
  }, [hasMore, isLoadingMore, page, fetchRequests]);

  /**
   * Refetch from the beginning
   */
  const refetch = useCallback(async () => {
    setPage(1);
    setRequests([]);
    await fetchRequests(1, false);
  }, [fetchRequests]);

  /**
   * Accept a follow request with optimistic update
   */
  const acceptRequest = useCallback(async (requestId: string): Promise<boolean> => {
    const authPhone = getAuthPhone();
    
    if (!authPhone) {
      onAcceptError?.(requestId, 'Please sign in to accept requests');
      return false;
    }

    // Check if already processing
    if (processingIds.has(requestId)) {
      return false;
    }

    // Optimistic update - remove from list
    const originalRequests = [...requests];
    const originalTotal = totalCount;
    
    addProcessing(requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setTotalCount(prev => Math.max(0, prev - 1));

    try {
      const response = await axios.post<HandleFollowRequestResponse>(
        '/api/user/follow-requests',
        {
          requestId,
          action: 'accept',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': authPhone,
          },
        }
      );

      if (mountedRef.current) {
        removeProcessing(requestId);
        
        if (response.data.success) {
          onAcceptSuccess?.(requestId);
          return true;
        } else {
          // Rollback
          setRequests(originalRequests);
          setTotalCount(originalTotal);
          onAcceptError?.(requestId, response.data.message || 'Failed to accept request');
          return false;
        }
      }
      return false;
    } catch (err) {
      if (mountedRef.current) {
        removeProcessing(requestId);
        
        // Rollback
        setRequests(originalRequests);
        setTotalCount(originalTotal);
        
        let errorMessage = 'Failed to accept request';
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        onAcceptError?.(requestId, errorMessage);
      }
      return false;
    }
  }, [requests, totalCount, processingIds, addProcessing, removeProcessing, onAcceptSuccess, onAcceptError]);

  /**
   * Reject a follow request with optimistic update
   */
  const rejectRequest = useCallback(async (requestId: string): Promise<boolean> => {
    const authPhone = getAuthPhone();
    
    if (!authPhone) {
      onRejectError?.(requestId, 'Please sign in to reject requests');
      return false;
    }

    // Check if already processing
    if (processingIds.has(requestId)) {
      return false;
    }

    // Optimistic update - remove from list
    const originalRequests = [...requests];
    const originalTotal = totalCount;
    
    addProcessing(requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setTotalCount(prev => Math.max(0, prev - 1));

    try {
      const response = await axios.post<HandleFollowRequestResponse>(
        '/api/user/follow-requests',
        {
          requestId,
          action: 'reject',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': authPhone,
          },
        }
      );

      if (mountedRef.current) {
        removeProcessing(requestId);
        
        if (response.data.success) {
          onRejectSuccess?.(requestId);
          return true;
        } else {
          // Rollback
          setRequests(originalRequests);
          setTotalCount(originalTotal);
          onRejectError?.(requestId, response.data.message || 'Failed to reject request');
          return false;
        }
      }
      return false;
    } catch (err) {
      if (mountedRef.current) {
        removeProcessing(requestId);
        
        // Rollback
        setRequests(originalRequests);
        setTotalCount(originalTotal);
        
        let errorMessage = 'Failed to reject request';
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        onRejectError?.(requestId, errorMessage);
      }
      return false;
    }
  }, [requests, totalCount, processingIds, addProcessing, removeProcessing, onRejectSuccess, onRejectError]);

  /**
   * Check if a request is being processed
   */
  const isProcessing = useCallback((requestId: string): boolean => {
    return processingIds.has(requestId);
  }, [processingIds]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (!skipInitialFetch) {
      fetchRequests(1, false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [skipInitialFetch]);

  return {
    requests,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    page,
    processingIds,
    loadMore,
    refetch,
    acceptRequest,
    rejectRequest,
    isProcessing,
  };
}

export default useFollowRequests;
