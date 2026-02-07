'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';
import type { NotificationData } from '@/components/notifications/NotificationItem';

/**
 * Standardized error object for consistent error handling
 */
export interface NotificationError {
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * Pagination state for notifications
 */
interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * API response structure for notifications
 */
interface NotificationsResponse {
  success: boolean;
  notifications: NotificationData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

/**
 * Options for useNotifications hook
 */
interface UseNotificationsOptions {
  /** Whether to enable automatic polling (default: true) */
  enablePolling?: boolean;
  /** Polling interval in milliseconds (default: 30000 - 30 seconds) */
  pollingInterval?: number;
  /** Initial page size (default: 20) */
  pageSize?: number;
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

/**
 * Return type for useNotifications hook
 */
interface UseNotificationsReturn {
  /** Array of notifications */
  notifications: NotificationData[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Whether initial fetch is loading */
  isLoading: boolean;
  /** Whether more notifications are loading */
  isLoadingMore: boolean;
  /** Error object if any */
  error: NotificationError | null;
  /** Pagination state */
  pagination: NotificationPagination;
  /** Fetch notifications (first page or refresh) */
  fetchNotifications: () => Promise<void>;
  /** Load more notifications (next page) */
  loadMore: () => Promise<void>;
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Whether mark all as read is in progress */
  isMarkingAllRead: boolean;
  /** Refresh notifications (alias for fetchNotifications) */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Retry failed fetch */
  retry: () => Promise<void>;
}

/**
 * useNotifications Hook
 * Manages notification state with polling, pagination, and mark as read functionality
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    pageSize = 20,
    autoFetch = true,
  } = options;

  // State
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [error, setError] = useState<NotificationError | null>(null);
  const [pagination, setPagination] = useState<NotificationPagination>({
    page: 1,
    limit: pageSize,
    total: 0,
    hasMore: false,
  });

  // Refs
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const hasFetchedOnce = useRef(false);

  /**
   * Fetch notifications from API
   * @param page - Page number to fetch
   * @param append - Whether to append to existing notifications
   * @param silent - Whether to skip showing loading state (for background refreshes)
   */
  const fetchNotifications = useCallback(async (page = 1, append = false, silent = false) => {
    // Check if user is authenticated before fetching
    const userPhone = typeof window !== 'undefined' ? localStorage.getItem('userPhone') : null;
    if (!userPhone) {
      // User not authenticated, ensure loading is false and skip fetch
      setIsLoading(false);
      setIsLoadingMore(false);
      hasFetchedOnce.current = true; // Mark as fetched to prevent infinite loading
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Show loading only for initial fetch when we have no data yet
    // Don't show loading for silent refreshes or when we already have notifications
    if (!append && !silent) {
      setIsLoading(true);
    } else if (append) {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const axiosResponse = await apiClient.get<NotificationsResponse>('/notifications', {
        params: {
          page,
          limit: pageSize,
        },
      });

      if (!isMountedRef.current) return;

      const response = axiosResponse.data;

      if (response.success) {
        const { notifications: newNotifications, pagination: paginationData, unreadCount: newUnreadCount } = response;

        if (append) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        setPagination({
          page: paginationData.page,
          limit: paginationData.limit,
          total: paginationData.total,
          hasMore: paginationData.page < paginationData.totalPages,
        });

        setUnreadCount(newUnreadCount);
        
        // Mark that we've fetched at least once (for silent refreshes)
        hasFetchedOnce.current = true;
      } else {
        // API returned success: false - extract error message
        const apiError = (response as { error?: string }).error || 'Failed to fetch notifications';
        throw new Error(apiError);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      
      // Extract meaningful error message from axios or generic error
      let errorMessage = 'Failed to load notifications';
      let isAuthError = false;
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Handle axios error specifically
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string }; status?: number } };
        if (axiosErr.response?.data?.error) {
          errorMessage = axiosErr.response.data.error;
        }
        if (axiosErr.response?.status === 401) {
          errorMessage = 'Please sign in to view notifications';
          isAuthError = true;
        } else if (axiosErr.response?.status === 404) {
          errorMessage = 'User not found';
          isAuthError = true;
        }
      }
      
      setError({
        message: errorMessage,
        retryable: !isAuthError,
      });
      
      // Only log unexpected errors in development (not auth errors)
      if (process.env.NODE_ENV === 'development' && !isAuthError) {
        console.error('Error fetching notifications:', errorMessage);
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [pageSize]);

  /**
   * Load more notifications (next page)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !pagination.hasMore) return;
    await fetchNotifications(pagination.page + 1, true);
  }, [fetchNotifications, isLoadingMore, pagination.hasMore, pagination.page]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const axiosResponse = await apiClient.post<{ success: boolean }>(`/notifications/${notificationId}/read`);
      const response = axiosResponse.data;

      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    setIsMarkingAllRead(true);
    try {
      const axiosResponse = await apiClient.post<{ success: boolean; modifiedCount: number }>('/notifications/read-all');
      const response = axiosResponse.data;

      if (response.success) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      setIsMarkingAllRead(false);
    }
  }, []);

  /**
   * Refresh notifications (alias for fetchNotifications)
   * Uses silent mode if we've already fetched once to avoid loading flicker
   */
  const refresh = useCallback(async () => {
    await fetchNotifications(1, false, hasFetchedOnce.current);
  }, [fetchNotifications]);

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
    await fetchNotifications(1, false);
  }, [clearError, fetchNotifications]);

  /**
   * Start/stop polling based on visibility
   */
  useEffect(() => {
    if (!enablePolling) return;

    let pollingTimeout: NodeJS.Timeout | null = null;

    const poll = async () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // Use silent=true for background polling to avoid showing loading spinner
        await fetchNotifications(1, false, true);
      }
    };

    const startPolling = () => {
      // Clear existing timeout
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }

      // Set up new polling interval
      pollingTimeout = setTimeout(async () => {
        await poll();
        if (isMountedRef.current) {
          startPolling(); // Schedule next poll
        }
      }, pollingInterval);
      
      pollingTimeoutRef.current = pollingTimeout;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible, fetch silently and start polling
        poll();
        startPolling();
      } else {
        // Tab became hidden, stop polling
        if (pollingTimeout) {
          clearTimeout(pollingTimeout);
          pollingTimeout = null;
        }
      }
    };

    // Initial polling setup
    if (document.visibilityState === 'visible') {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, [enablePolling, pollingInterval]);

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);

  /**
   * Auto-fetch on mount (only once)
   */
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchNotifications(1, false);
    }
  }, [autoFetch]);

  /**
   * Cleanup on unmount only
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - only runs on unmount

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    error,
    pagination,
    fetchNotifications: refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
    refresh,
    clearError,
    retry,
  };
}

export default useNotifications;
