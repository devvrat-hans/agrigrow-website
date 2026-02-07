/**
 * useGroups Hook - Manages groups list state with filtering and search
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupData, GroupType } from '@/types/group';

export interface GroupsError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface GroupsFilters {
  groupType?: GroupType | null;
  crop?: string | null;
  region?: string | null;
  sortBy?: 'popular' | 'recent' | 'alphabetical';
}

export interface GroupsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface GroupsState {
  groups: GroupData[];
  loading: boolean;
  refreshing: boolean;
  error: GroupsError | null;
  hasMore: boolean;
  pagination: GroupsPagination | null;
  searchQuery: string;
  filters: GroupsFilters;
}

export interface UseGroupsOptions {
  initialFilters?: GroupsFilters;
  initialSearch?: string;
  limit?: number;
  autoFetch?: boolean;
  searchDebounce?: number;
}

export interface UseGroupsReturn {
  groups: GroupData[];
  loading: boolean;
  refreshing: boolean;
  error: GroupsError | null;
  hasMore: boolean;
  pagination: GroupsPagination | null;
  searchQuery: string;
  filters: GroupsFilters;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => void;
  setFilters: (filters: Partial<GroupsFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  retry: () => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<GroupData>) => void;
  removeGroup: (groupId: string) => void;
}

const defaultFilters: GroupsFilters = {
  groupType: null,
  crop: null,
  region: null,
  sortBy: 'popular',
};

export function useGroups(options: UseGroupsOptions = {}): UseGroupsReturn {
  const { initialFilters = {}, initialSearch = '', limit = 20, autoFetch = true, searchDebounce = 300 } = options;
  const [state, setState] = useState<GroupsState>({
    groups: [], loading: false, refreshing: false, error: null, hasMore: true,
    pagination: null, searchQuery: initialSearch, filters: { ...defaultFilters, ...initialFilters },
  });
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearchRef = useRef<string>(initialSearch);

  const buildQueryParams = useCallback((page: number, searchOverride?: string): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    const search = searchOverride !== undefined ? searchOverride : debouncedSearchRef.current;
    if (search?.trim()) params.set('search', search.trim());
    const { groupType, crop, region, sortBy } = state.filters;
    if (groupType) params.set('groupType', groupType);
    if (crop?.trim()) params.set('crop', crop.trim());
    if (region?.trim()) params.set('region', region.trim());
    if (sortBy) params.set('sortBy', sortBy);
    return params;
  }, [limit, state.filters]);

  const fetchGroups = useCallback(async (isRefresh = false, page = 1, searchOverride?: string): Promise<void> => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setState(prev => ({ ...prev, loading: !isRefresh && page === 1, refreshing: isRefresh, error: null }));
    try {
      const params = buildQueryParams(page, searchOverride);
      const response = await apiClient.get(`/groups?${params.toString()}`);
      if (!mountedRef.current) return;
      if (response.data.success) {
        const newGroups: GroupData[] = response.data.data || [];
        const pag: GroupsPagination = response.data.pagination || { page, limit, total: newGroups.length, totalPages: 1, hasNextPage: false, hasPrevPage: page > 1 };
        setState(prev => ({ ...prev, groups: isRefresh || page === 1 ? newGroups : [...prev.groups, ...newGroups], loading: false, refreshing: false, hasMore: pag.hasNextPage, pagination: pag, error: null }));
      } else { throw new Error(response.data.error || 'Failed to fetch groups'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, loading: false, refreshing: false, error: { message: err instanceof Error ? err.message : 'An error occurred', retryable: true } }));
    } finally { isFetchingRef.current = false; }
  }, [buildQueryParams, limit]);

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.loading || !state.pagination) return;
    await fetchGroups(false, state.pagination.page + 1);
  }, [state.hasMore, state.loading, state.pagination, fetchGroups]);

  const refresh = useCallback(async (): Promise<void> => { await fetchGroups(true, 1); }, [fetchGroups]);

  const search = useCallback((query: string): void => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { debouncedSearchRef.current = query; fetchGroups(false, 1, query); }, searchDebounce);
  }, [searchDebounce, fetchGroups]);

  const setFilters = useCallback((newFilters: Partial<GroupsFilters>): void => { setState(prev => ({ ...prev, filters: { ...prev.filters, ...newFilters } })); }, []);
  const clearFilters = useCallback((): void => { setState(prev => ({ ...prev, filters: { ...defaultFilters }, searchQuery: '' })); debouncedSearchRef.current = ''; }, []);
  const clearError = useCallback((): void => { setState(prev => ({ ...prev, error: null })); }, []);
  const retry = useCallback(async (): Promise<void> => { await fetchGroups(false, 1); }, [fetchGroups]);
  const updateGroup = useCallback((groupId: string, updates: Partial<GroupData>): void => { setState(prev => ({ ...prev, groups: prev.groups.map(g => g._id === groupId || g.slug === groupId ? { ...g, ...updates } : g) })); }, []);
  const removeGroup = useCallback((groupId: string): void => { setState(prev => ({ ...prev, groups: prev.groups.filter(g => g._id !== groupId && g.slug !== groupId) })); }, []);

  useEffect(() => { if (autoFetch) fetchGroups(false, 1); }, [state.filters]);  
  useEffect(() => { mountedRef.current = true; if (autoFetch) fetchGroups(false, 1); return () => { mountedRef.current = false; if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }; }, []);  

  return { groups: state.groups, loading: state.loading, refreshing: state.refreshing, error: state.error, hasMore: state.hasMore, pagination: state.pagination, searchQuery: state.searchQuery, filters: state.filters, fetchMore, refresh, search, setFilters, clearFilters, clearError, retry, updateGroup, removeGroup };
}

export default useGroups;