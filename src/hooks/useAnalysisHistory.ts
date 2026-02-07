'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '@/lib/api-client';
import type {
  AnalysisHistoryItem,
  AnalysisFilters,
  CropHealthStatus,
  GetHistoryResponse,
  DeleteAnalysisResponse,
} from '@/types/crop-ai';

// Pagination state
export interface PaginationState {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

// Hook options
export interface UseAnalysisHistoryOptions {
  limit?: number;
  autoFetch?: boolean;
  filters?: AnalysisFilters;
}

// Hook state
export interface UseAnalysisHistoryState {
  analyses: AnalysisHistoryItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  pagination: PaginationState;
}

// Hook return type
export interface UseAnalysisHistoryReturn extends UseAnalysisHistoryState {
  fetchHistory: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteAnalysis: (id: string) => Promise<boolean>;
  setFilters: (filters: AnalysisFilters) => void;
  clearFilters: () => void;
}

// Default pagination
const defaultPagination: PaginationState = {
  page: 1,
  limit: 10,
  totalPages: 0,
  totalCount: 0,
  hasMore: false,
};

// Initial state
const initialState: UseAnalysisHistoryState = {
  analyses: [],
  loading: false,
  refreshing: false,
  error: null,
  hasMore: false,
  pagination: defaultPagination,
};

/**
 * Hook for managing crop analysis history
 * 
 * @example
 * ```tsx
 * const { 
 *   analyses, 
 *   loading, 
 *   hasMore, 
 *   fetchHistory, 
 *   fetchMore, 
 *   deleteAnalysis 
 * } = useAnalysisHistory({ limit: 10 });
 * 
 * useEffect(() => {
 *   fetchHistory();
 * }, []);
 * ```
 */
export function useAnalysisHistory(options: UseAnalysisHistoryOptions = {}): UseAnalysisHistoryReturn {
  const { limit = 10, autoFetch = false, filters: initialFilters } = options;
  
  const [state, setState] = useState<UseAnalysisHistoryState>({
    ...initialState,
    pagination: { ...defaultPagination, limit },
  });
  
  const [filters, setFiltersState] = useState<AnalysisFilters>(initialFilters || {});
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  // Build query string from filters and pagination
  const buildQueryString = useCallback((page: number, currentFilters: AnalysisFilters): string => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    
    if (currentFilters.cropType) {
      params.set('cropType', currentFilters.cropType);
    }
    if (currentFilters.healthStatus) {
      params.set('healthStatus', currentFilters.healthStatus);
    }
    if (currentFilters.status) {
      params.set('status', currentFilters.status);
    }
    if (currentFilters.dateFrom) {
      params.set('dateFrom', currentFilters.dateFrom);
    }
    if (currentFilters.dateTo) {
      params.set('dateTo', currentFilters.dateTo);
    }
    
    return params.toString();
  }, [limit]);

  // Fetch history (initial load or after filter change)
  const fetchHistory = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const queryString = buildQueryString(1, filters);
      const response = await apiClient.get<GetHistoryResponse>(
        `/crop-ai/history?${queryString}`
      );

      if (!isMounted.current) return;

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch history');
      }

      const { analyses, pagination } = response.data.data;

      setState(prev => ({
        ...prev,
        analyses,
        loading: false,
        error: null,
        hasMore: pagination.hasMore,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages: pagination.totalPages,
          totalCount: pagination.totalCount,
          hasMore: pagination.hasMore,
        },
      }));

    } catch (error) {
      if (!isMounted.current) return;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to fetch analysis history';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [filters, buildQueryString]);

  // Fetch more (pagination)
  const fetchMore = useCallback(async () => {
    if (fetchingRef.current || !state.hasMore) return;
    fetchingRef.current = true;

    const nextPage = state.pagination.page + 1;
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const queryString = buildQueryString(nextPage, filters);
      const response = await apiClient.get<GetHistoryResponse>(
        `/crop-ai/history?${queryString}`
      );

      if (!isMounted.current) return;

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch more history');
      }

      const { analyses, pagination } = response.data.data;

      setState(prev => ({
        ...prev,
        analyses: [...prev.analyses, ...analyses],
        loading: false,
        error: null,
        hasMore: pagination.hasMore,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages: pagination.totalPages,
          totalCount: pagination.totalCount,
          hasMore: pagination.hasMore,
        },
      }));

    } catch (error) {
      if (!isMounted.current) return;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load more analyses';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [state.hasMore, state.pagination.page, filters, buildQueryString]);

  // Refresh (reload from page 1)
  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setState(prev => ({
      ...prev,
      refreshing: true,
      error: null,
    }));

    try {
      const queryString = buildQueryString(1, filters);
      const response = await apiClient.get<GetHistoryResponse>(
        `/crop-ai/history?${queryString}`
      );

      if (!isMounted.current) return;

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to refresh history');
      }

      const { analyses, pagination } = response.data.data;

      setState(prev => ({
        ...prev,
        analyses,
        refreshing: false,
        error: null,
        hasMore: pagination.hasMore,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages: pagination.totalPages,
          totalCount: pagination.totalCount,
          hasMore: pagination.hasMore,
        },
      }));

    } catch (error) {
      if (!isMounted.current) return;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to refresh history';

      setState(prev => ({
        ...prev,
        refreshing: false,
        error: errorMessage,
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [filters, buildQueryString]);

  // Delete analysis
  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete<DeleteAnalysisResponse>(
        `/crop-ai/${id}`
      );

      if (!isMounted.current) return false;

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete analysis');
      }

      // Remove from local state
      setState(prev => ({
        ...prev,
        analyses: prev.analyses.filter(a => a.id !== id),
        pagination: {
          ...prev.pagination,
          totalCount: Math.max(0, prev.pagination.totalCount - 1),
        },
      }));

      return true;

    } catch (error) {
      if (!isMounted.current) return false;

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to delete analysis';

      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: AnalysisFilters) => {
    setFiltersState(newFilters);
    // Reset pagination and fetch with new filters
    setState(prev => ({
      ...prev,
      analyses: [],
      pagination: { ...defaultPagination, limit },
    }));
  }, [limit]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setState(prev => ({
      ...prev,
      analyses: [],
      pagination: { ...defaultPagination, limit },
    }));
  }, [limit]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);

  // Auto-fetch on mount if enabled (only once)
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchHistory();
    }
  }, [autoFetch]);

  // Refetch when filters change (but not on initial mount)
  const filtersString = JSON.stringify(filters);
  useEffect(() => {
    // Only refetch if initial fetch was done and filters actually changed
    if (initialFetchDone.current && state.analyses.length === 0 && !state.loading && !fetchingRef.current) {
      fetchHistory();
    }
  }, [filtersString]);

  return {
    ...state,
    fetchHistory,
    fetchMore,
    refresh,
    deleteAnalysis,
    setFilters,
    clearFilters,
  };
}

// Re-export types for convenience
export type {
  AnalysisHistoryItem,
  AnalysisFilters,
  CropHealthStatus,
};

export default useAnalysisHistory;
