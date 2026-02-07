/**
 * useViewTracking Hook
 * 
 * Tracks post views when posts become visible in the viewport.
 * Uses batching and debouncing to minimize API calls.
 */

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Options for view tracking
 */
interface UseViewTrackingOptions {
  /** Debounce delay in milliseconds before sending batch (default: 1500ms) */
  debounceMs?: number;
  /** Maximum batch size before forcing a send (default: 10) */
  maxBatchSize?: number;
  /** Minimum viewport visibility percentage (default: 0.5 = 50%) */
  visibilityThreshold?: number;
  /** Minimum time a post must be visible in ms (default: 1000ms) */
  minViewDurationMs?: number;
}

/**
 * Hook return type
 */
interface UseViewTrackingReturn {
  /** Call this when a post becomes visible in viewport */
  trackView: (postId: string) => void;
  /** Force flush any pending views */
  flush: () => void;
}

/**
 * Get user phone from localStorage
 */
function getUserPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPhone');
}

/**
 * Custom hook for tracking post views in the feed
 * 
 * Features:
 * - Batches multiple views into single API calls
 * - Debounces to reduce network requests
 * - Deduplicates views within a session
 * - Only tracks for authenticated users
 * 
 * @param options - Configuration options
 * @returns View tracking functions
 */
export function useViewTracking(
  options: UseViewTrackingOptions = {}
): UseViewTrackingReturn {
  const {
    debounceMs = 1500,
    maxBatchSize = 10,
  } = options;

  // Use state to track user phone (read from localStorage on mount)
  const [userPhone, setUserPhone] = useState<string | null>(null);
  
  useEffect(() => {
    setUserPhone(getUserPhone());
  }, []);
  
  // Track pending views to batch
  const pendingViewsRef = useRef<Set<string>>(new Set());
  
  // Track already viewed posts in this session to avoid duplicates
  const viewedPostsRef = useRef<Set<string>>(new Set());
  
  // Debounce timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Send batch of views to the API
   */
  const sendBatch = useCallback(async () => {
    if (pendingViewsRef.current.size === 0) return;
    if (!userPhone) return;

    const postIds = Array.from(pendingViewsRef.current);
    pendingViewsRef.current.clear();

    try {
      const response = await fetch('/api/posts/track-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-phone': userPhone,
        },
        body: JSON.stringify({ postIds }),
      });

      if (!response.ok) {
        console.warn('Failed to track views:', await response.text());
      }
    } catch (error) {
      console.error('Error tracking views:', error);
      // Re-add to pending on failure (optional - could also just drop them)
      // postIds.forEach(id => pendingViewsRef.current.add(id));
    }
  }, [userPhone]);

  /**
   * Schedule batch send with debouncing
   */
  const scheduleBatch = useCallback(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If batch is full, send immediately
    if (pendingViewsRef.current.size >= maxBatchSize) {
      sendBatch();
      return;
    }

    // Otherwise debounce
    timerRef.current = setTimeout(() => {
      sendBatch();
    }, debounceMs);
  }, [debounceMs, maxBatchSize, sendBatch]);

  /**
   * Track a view for a post
   */
  const trackView = useCallback((postId: string) => {
    // Skip if no user is logged in
    if (!userPhone) return;

    // Skip if already viewed in this session
    if (viewedPostsRef.current.has(postId)) return;

    // Mark as viewed in this session
    viewedPostsRef.current.add(postId);

    // Add to pending batch
    pendingViewsRef.current.add(postId);

    // Schedule batch send
    scheduleBatch();
  }, [userPhone, scheduleBatch]);

  /**
   * Force flush pending views
   */
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    sendBatch();
  }, [sendBatch]);

  // Cleanup on unmount - flush pending views
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Attempt to send remaining views on unmount
      if (pendingViewsRef.current.size > 0 && userPhone) {
        const postIds = Array.from(pendingViewsRef.current);
        // Use navigator.sendBeacon for reliable delivery on unmount
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/posts/track-views',
            JSON.stringify({ 
              postIds,
              _headers: { 'x-user-phone': userPhone }
            })
          );
        }
      }
    };
  }, [userPhone]);

  // Flush when page becomes hidden (user navigates away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flush]);

  return {
    trackView,
    flush,
  };
}

export default useViewTracking;
