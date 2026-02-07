/**
 * Performance Utilities for Agrigrow Feed
 * 
 * Provides request deduplication, caching, and performance monitoring
 * to optimize the feed experience.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry with timestamp for expiration
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Pending request for deduplication
 */
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// ============================================================================
// Request Deduplication
// ============================================================================

/**
 * Map of pending requests keyed by request key
 */
const pendingRequests = new Map<string, PendingRequest<unknown>>();

/**
 * Generate a unique key for a request
 */
export function generateRequestKey(
  url: string,
  method: string = 'GET',
  params?: Record<string, unknown>
): string {
  const paramString = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${paramString}`;
}

/**
 * Deduplicate identical concurrent requests
 * Returns the same promise for identical requests made within a short window
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  windowMs: number = 100 // 100ms dedup window
): Promise<T> {
  const existing = pendingRequests.get(key) as PendingRequest<T> | undefined;
  
  // If there's a pending request within the window, return its promise
  if (existing && Date.now() - existing.timestamp < windowMs) {
    return existing.promise;
  }
  
  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    setTimeout(() => {
      pendingRequests.delete(key);
    }, windowMs);
  });
  
  pendingRequests.set(key, {
    promise: promise as Promise<unknown>,
    timestamp: Date.now(),
  });
  
  return promise;
}

/**
 * Clear all pending requests (useful for testing/cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

// ============================================================================
// In-Memory Cache
// ============================================================================

/**
 * Simple in-memory cache with TTL
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  /**
   * Get item from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set item in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }
  
  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > (entry as CacheEntry<unknown>).expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Invalidate entries matching a pattern
   * Accepts either RegExp or string (will be converted to RegExp)
   */
  invalidatePattern(pattern: RegExp | string): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

// Global cache instance
export const feedCache = new MemoryCache(100);

// Cache key generators
export const cacheKeys = {
  post: (id: string) => `post:${id}`,
  feed: (
    category?: string,
    page?: number,
    limit?: number,
    sortBy?: string,
    crop?: string
  ) => {
    const parts = [
      'feed',
      category || 'all',
      page?.toString() || '1',
      limit?.toString() || '10',
      sortBy || 'newest',
    ];
    if (crop) parts.push(crop);
    return parts.join(':');
  },
  comments: (postId: string, cursor?: string) => 
    `comments:${postId}:${cursor || 'initial'}`,
  userPosts: (userId: string) => `user-posts:${userId}`,
  trending: () => 'trending',
};

// ============================================================================
// Performance Monitoring (Development Only)
// ============================================================================

/**
 * Render count tracker for development debugging
 */
const renderCounts = new Map<string, number>();

/**
 * Track component render count (development only)
 */
export function trackRender(componentName: string): number {
  if (process.env.NODE_ENV !== 'development') return 0;
  
  const count = (renderCounts.get(componentName) || 0) + 1;
  renderCounts.set(componentName, count);
  
  // Log every 10 renders
  if (count % 10 === 0) {
    console.debug(`[Performance] ${componentName} rendered ${count} times`);
  }
  
  return count;
}

/**
 * Get render count for a component
 */
export function getRenderCount(componentName: string): number {
  return renderCounts.get(componentName) || 0;
}

/**
 * Reset render counts (useful for testing)
 */
export function resetRenderCounts(): void {
  renderCounts.clear();
}

/**
 * Get all render counts for debugging
 */
export function getAllRenderCounts(): Record<string, number> {
  return Object.fromEntries(renderCounts);
}

// ============================================================================
// React Optimization Utilities
// ============================================================================

/**
 * Shallow compare two objects (for React.memo comparison)
 */
export function shallowEqual<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * Create a stable comparison function for specific props
 * Useful for React.memo when you only want to compare certain props
 */
export function createPropsComparator<T extends Record<string, unknown>>(
  propsToCompare: (keyof T)[]
): (prevProps: T, nextProps: T) => boolean {
  return (prevProps: T, nextProps: T) => {
    for (const prop of propsToCompare) {
      if (prevProps[prop] !== nextProps[prop]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Debounce function for optimizing frequent updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for limiting function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ============================================================================
// Virtual List Utilities
// ============================================================================

/**
 * Calculate visible range for virtualization
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);
  
  return { start, end };
}

/**
 * Get spacer heights for virtualized list
 */
export function getSpacerHeights(
  start: number,
  end: number,
  totalItems: number,
  itemHeight: number
): { topHeight: number; bottomHeight: number } {
  return {
    topHeight: start * itemHeight,
    bottomHeight: (totalItems - end) * itemHeight,
  };
}

export default {
  deduplicateRequest,
  generateRequestKey,
  feedCache,
  cacheKeys,
  trackRender,
  shallowEqual,
  createPropsComparator,
  debounce,
  throttle,
  calculateVisibleRange,
  getSpacerHeights,
};
