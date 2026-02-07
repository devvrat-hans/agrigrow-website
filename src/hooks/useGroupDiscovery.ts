'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupData } from '@/types/group';

// ============================================
// Types
// ============================================

export interface DiscoveryError {
  message: string;
  code?: string;
  retryable?: boolean;
}

interface DiscoveryMeta {
  total: number;
  returned: number;
  isPersonalized: boolean;
  userCrops?: string[];
  userRegion?: string | null;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface DiscoveryState {
  recommendedGroups: GroupData[];
  popularGroups: GroupData[];
  recentGroups: GroupData[];
  isLoading: boolean;
  loadingRecommended: boolean;
  loadingPopular: boolean;
  loadingRecent: boolean;
  error: DiscoveryError | null;
  meta: DiscoveryMeta | null;
}

export interface UseGroupDiscoveryOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Cache TTL in milliseconds (default: 2 minutes) */
  cacheTTL?: number;
  /** Limit for each category */
  limit?: number;
}

export interface UseGroupDiscoveryReturn {
  /** Personalized recommended groups */
  recommendedGroups: GroupData[];
  /** Popular groups by member count */
  popularGroups: GroupData[];
  /** Recently active/created groups */
  recentGroups: GroupData[];
  /** Overall loading state */
  isLoading: boolean;
  /** Loading states for individual categories */
  loadingRecommended: boolean;
  loadingPopular: boolean;
  loadingRecent: boolean;
  /** Error state */
  error: DiscoveryError | null;
  /** Discovery metadata */
  meta: DiscoveryMeta | null;
  /** Refresh recommendations */
  refreshRecommendations: () => Promise<void>;
  /** Refresh popular groups */
  refreshPopular: () => Promise<void>;
  /** Refresh recent groups */
  refreshRecent: () => Promise<void>;
  /** Refresh all data */
  refreshAll: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

// ============================================
// Cache
// ============================================

const cache: {
  recommended: CachedData<GroupData[]> | null;
  popular: CachedData<GroupData[]> | null;
  recent: CachedData<GroupData[]> | null;
  meta: CachedData<DiscoveryMeta> | null;
} = {
  recommended: null,
  popular: null,
  recent: null,
  meta: null,
};

function isCacheValid<T>(cached: CachedData<T> | null, ttl: number): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttl;
}

// ============================================
// Hook Implementation
// ============================================

export function useGroupDiscovery(
  options: UseGroupDiscoveryOptions = {}
): UseGroupDiscoveryReturn {
  const {
    autoFetch = true,
    cacheTTL = 2 * 60 * 1000, // 2 minutes default
    limit = 10,
  } = options;

  const [state, setState] = useState<DiscoveryState>({
    recommendedGroups: cache.recommended?.data || [],
    popularGroups: cache.popular?.data || [],
    recentGroups: cache.recent?.data || [],
    isLoading: false,
    loadingRecommended: false,
    loadingPopular: false,
    loadingRecent: false,
    error: null,
    meta: cache.meta?.data || null,
  });

  const mountedRef = useRef(true);
  const fetchingRecommendedRef = useRef(false);
  const fetchingPopularRef = useRef(false);
  const fetchingRecentRef = useRef(false);

  // Fetch recommended/personalized groups
  const fetchRecommendations = useCallback(async (force: boolean = false) => {
    if (fetchingRecommendedRef.current) return;
    
    // Check cache first
    if (!force && isCacheValid(cache.recommended, cacheTTL)) {
      setState(prev => ({
        ...prev,
        recommendedGroups: cache.recommended!.data,
        meta: cache.meta?.data || null,
      }));
      return;
    }

    fetchingRecommendedRef.current = true;
    setState(prev => ({ ...prev, loadingRecommended: true, error: null }));

    try {
      const response = await apiClient.get(`/groups/discover?limit=${limit}`);
      
      if (!mountedRef.current) return;

      if (response.data.success) {
        const groups = response.data.data.groups || [];
        const meta = response.data.data.meta || null;
        
        // Update cache
        cache.recommended = { data: groups, timestamp: Date.now() };
        if (meta) {
          cache.meta = { data: meta, timestamp: Date.now() };
        }
        
        setState(prev => ({
          ...prev,
          recommendedGroups: groups,
          meta,
          loadingRecommended: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to fetch recommendations' },
          loadingRecommended: false,
        }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setState(prev => ({
        ...prev,
        error: { message, retryable: true },
        loadingRecommended: false,
      }));
    } finally {
      fetchingRecommendedRef.current = false;
    }
  }, [cacheTTL, limit]);

  // Fetch popular groups
  const fetchPopular = useCallback(async (force: boolean = false) => {
    if (fetchingPopularRef.current) return;
    
    // Check cache first
    if (!force && isCacheValid(cache.popular, cacheTTL)) {
      setState(prev => ({
        ...prev,
        popularGroups: cache.popular!.data,
      }));
      return;
    }

    fetchingPopularRef.current = true;
    setState(prev => ({ ...prev, loadingPopular: true, error: null }));

    try {
      const response = await apiClient.get(`/groups/popular?limit=${limit}`);
      
      if (!mountedRef.current) return;

      if (response.data.success) {
        const groups = response.data.data.groups || response.data.data || [];
        
        // Update cache
        cache.popular = { data: groups, timestamp: Date.now() };
        
        setState(prev => ({
          ...prev,
          popularGroups: groups,
          loadingPopular: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to fetch popular groups' },
          loadingPopular: false,
        }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch popular groups';
      setState(prev => ({
        ...prev,
        error: { message, retryable: true },
        loadingPopular: false,
      }));
    } finally {
      fetchingPopularRef.current = false;
    }
  }, [cacheTTL, limit]);

  // Fetch recent groups
  const fetchRecent = useCallback(async (force: boolean = false) => {
    if (fetchingRecentRef.current) return;
    
    // Check cache first
    if (!force && isCacheValid(cache.recent, cacheTTL)) {
      setState(prev => ({
        ...prev,
        recentGroups: cache.recent!.data,
      }));
      return;
    }

    fetchingRecentRef.current = true;
    setState(prev => ({ ...prev, loadingRecent: true, error: null }));

    try {
      const response = await apiClient.get(`/groups?sortBy=recent&limit=${limit}`);
      
      if (!mountedRef.current) return;

      if (response.data.success) {
        const groups = response.data.data.groups || response.data.data || [];
        
        // Update cache
        cache.recent = { data: groups, timestamp: Date.now() };
        
        setState(prev => ({
          ...prev,
          recentGroups: groups,
          loadingRecent: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: { message: response.data.error || 'Failed to fetch recent groups' },
          loadingRecent: false,
        }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch recent groups';
      setState(prev => ({
        ...prev,
        error: { message, retryable: true },
        loadingRecent: false,
      }));
    } finally {
      fetchingRecentRef.current = false;
    }
  }, [cacheTTL, limit]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await Promise.all([
        fetchRecommendations(true),
        fetchPopular(true),
        fetchRecent(true),
      ]);
    } finally {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [fetchRecommendations, fetchPopular, fetchRecent]);

  // Refresh recommendations
  const refreshRecommendations = useCallback(async () => {
    await fetchRecommendations(true);
  }, [fetchRecommendations]);

  // Refresh popular
  const refreshPopular = useCallback(async () => {
    await fetchPopular(true);
  }, [fetchPopular]);

  // Refresh recent
  const refreshRecent = useCallback(async () => {
    await fetchRecent(true);
  }, [fetchRecent]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Compute overall loading state
  const isLoading = state.isLoading || state.loadingRecommended || state.loadingPopular || state.loadingRecent;

  // Auto-fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoFetch) {
      // Fetch all categories
      const needsRecommended = !isCacheValid(cache.recommended, cacheTTL);
      const needsPopular = !isCacheValid(cache.popular, cacheTTL);
      const needsRecent = !isCacheValid(cache.recent, cacheTTL);
      
      if (needsRecommended || needsPopular || needsRecent) {
        setState(prev => ({ ...prev, isLoading: true }));
        
        Promise.all([
          needsRecommended ? fetchRecommendations(false) : Promise.resolve(),
          needsPopular ? fetchPopular(false) : Promise.resolve(),
          needsRecent ? fetchRecent(false) : Promise.resolve(),
        ]).finally(() => {
          if (mountedRef.current) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        });
      }
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, cacheTTL, fetchRecommendations, fetchPopular, fetchRecent]);

  return {
    recommendedGroups: state.recommendedGroups,
    popularGroups: state.popularGroups,
    recentGroups: state.recentGroups,
    isLoading,
    loadingRecommended: state.loadingRecommended,
    loadingPopular: state.loadingPopular,
    loadingRecent: state.loadingRecent,
    error: state.error,
    meta: state.meta,
    refreshRecommendations,
    refreshPopular,
    refreshRecent,
    refreshAll,
    clearError,
  };
}

export default useGroupDiscovery;
