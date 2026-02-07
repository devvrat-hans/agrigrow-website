'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Latest post preview from new posts check
 */
interface LatestPostPreview {
  _id: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
  };
  postType: string;
  createdAt: string;
}

/**
 * Response from new posts count API
 */
interface NewPostsCountResponse {
  success: boolean;
  count: number;
  latestPost: LatestPostPreview | null;
  since: string;
  checkedAt: string;
  error?: string;
}

/**
 * Options for useNewPostsPolling hook
 */
interface UseNewPostsPollingOptions {
  /** Polling interval in milliseconds (default: 60000 = 60 seconds) */
  pollingInterval?: number;
  /** Category filter to check for new posts */
  category?: string;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
  /** Callback when new posts are detected */
  onNewPostsDetected?: (count: number, latestPost: LatestPostPreview | null) => void;
}

/**
 * Return type for useNewPostsPolling hook
 */
interface UseNewPostsPollingReturn {
  /** Count of new posts since last refresh */
  newPostsCount: number;
  /** Preview of the latest new post */
  latestPost: LatestPostPreview | null;
  /** Whether currently checking for new posts */
  isChecking: boolean;
  /** Last check timestamp */
  lastChecked: Date | null;
  /** Reset new posts count (call this after user refreshes feed) */
  resetNewPosts: () => void;
  /** Manually trigger a check for new posts */
  checkNow: () => Promise<void>;
  /** Update the reference timestamp (call this when feed is refreshed) */
  updateTimestamp: (timestamp?: Date) => void;
}

/**
 * Hook for polling new posts count
 * Implements real-time-like updates by polling every 60 seconds
 */
export function useNewPostsPolling(
  options: UseNewPostsPollingOptions = {}
): UseNewPostsPollingReturn {
  const {
    pollingInterval = 60000, // 60 seconds
    category = 'all',
    enabled = true,
    onNewPostsDetected,
  } = options;

  // State
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [latestPost, setLatestPost] = useState<LatestPostPreview | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Refs
  const lastRefreshTimestamp = useRef<Date>(new Date());
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const onNewPostsDetectedRef = useRef(onNewPostsDetected);

  // Keep callback ref updated
  useEffect(() => {
    onNewPostsDetectedRef.current = onNewPostsDetected;
  }, [onNewPostsDetected]);

  /**
   * Check for new posts since last refresh
   */
  const checkForNewPosts = useCallback(async () => {
    if (!enabled || isChecking) return;

    setIsChecking(true);

    try {
      const userPhone = localStorage.getItem('userPhone');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (userPhone) {
        headers['x-user-phone'] = userPhone;
      }

      const params = new URLSearchParams({
        since: lastRefreshTimestamp.current.toISOString(),
      });
      if (category && category !== 'all') {
        params.set('category', category);
      }

      const response = await fetch(`/api/feed/new-posts-count?${params.toString()}`, {
        headers,
      });

      if (!isMountedRef.current) return;

      const data: NewPostsCountResponse = await response.json();

      if (data.success) {
        setNewPostsCount(data.count);
        setLatestPost(data.latestPost);
        setLastChecked(new Date(data.checkedAt));

        // Notify if new posts detected
        if (data.count > 0 && onNewPostsDetectedRef.current) {
          onNewPostsDetectedRef.current(data.count, data.latestPost);
        }
      }
    } catch (error) {
      console.error('Error checking for new posts:', error);
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [enabled, category, isChecking]);

  /**
   * Reset new posts count (called when user refreshes feed)
   */
  const resetNewPosts = useCallback(() => {
    setNewPostsCount(0);
    setLatestPost(null);
    lastRefreshTimestamp.current = new Date();
  }, []);

  /**
   * Manually trigger a check
   */
  const checkNow = useCallback(async () => {
    await checkForNewPosts();
  }, [checkForNewPosts]);

  /**
   * Update the reference timestamp
   */
  const updateTimestamp = useCallback((timestamp?: Date) => {
    lastRefreshTimestamp.current = timestamp || new Date();
    setNewPostsCount(0);
    setLatestPost(null);
  }, []);

  /**
   * Set up polling with visibility API support
   */
  useEffect(() => {
    isMountedRef.current = true;

    const startPolling = () => {
      // Clear any existing timeout
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }

      // Only poll if enabled and document is visible
      if (enabled && document.visibilityState === 'visible') {
        pollingTimeoutRef.current = setTimeout(() => {
          checkForNewPosts().then(() => {
            // Schedule next check
            if (isMountedRef.current) {
              startPolling();
            }
          });
        }, pollingInterval);
      }
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check immediately when tab becomes visible
        checkForNewPosts();
        // Resume polling
        startPolling();
      } else {
        // Pause polling when tab is hidden
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
      }
    };

    // Start polling
    if (enabled) {
      // Initial check after a short delay (to let feed load first)
      const initialTimeout = setTimeout(() => {
        checkForNewPosts().then(startPolling);
      }, 5000);

      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(initialTimeout);
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [enabled, pollingInterval, checkForNewPosts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    newPostsCount,
    latestPost,
    isChecking,
    lastChecked,
    resetNewPosts,
    checkNow,
    updateTimestamp,
  };
}

export default useNewPostsPolling;
