/**
 * useGroupMembers Hook - Manages group members list with actions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupMemberData, MemberRole, MemberStatus } from '@/types/group';

export interface MembersError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface MembersFilters {
  role?: MemberRole | null;
  status?: MemberStatus | null;
}

export interface MembersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface MembersState {
  members: GroupMemberData[];
  loading: boolean;
  refreshing: boolean;
  error: MembersError | null;
  hasMore: boolean;
  pagination: MembersPagination | null;
  searchQuery: string;
  filters: MembersFilters;
}

export interface UseGroupMembersOptions {
  initialFilters?: MembersFilters;
  limit?: number;
  autoFetch?: boolean;
  searchDebounce?: number;
}

export interface UseGroupMembersReturn {
  members: GroupMemberData[];
  loading: boolean;
  refreshing: boolean;
  error: MembersError | null;
  hasMore: boolean;
  pagination: MembersPagination | null;
  filters: MembersFilters;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  searchMembers: (query: string) => void;
  setFilters: (filters: Partial<MembersFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  updateMemberRole: (userId: string, newRole: MemberRole) => Promise<boolean>;
  removeMember: (userId: string) => Promise<boolean>;
  banMember: (userId: string, reason?: string) => Promise<boolean>;
  unbanMember: (userId: string) => Promise<boolean>;
  inviteMember: (phone: string) => Promise<boolean>;
}

const defaultFilters: MembersFilters = { role: null, status: 'active' };

export function useGroupMembers(groupId: string | null | undefined, options: UseGroupMembersOptions = {}): UseGroupMembersReturn {
  const { initialFilters = {}, limit = 20, autoFetch = true, searchDebounce = 300 } = options;
  const [state, setState] = useState<MembersState>({
    members: [], loading: false, refreshing: false, error: null, hasMore: true,
    pagination: null, searchQuery: '', filters: { ...defaultFilters, ...initialFilters },
  });
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearchRef = useRef<string>('');

  const buildQueryParams = useCallback((page: number, searchOverride?: string): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    const search = searchOverride !== undefined ? searchOverride : debouncedSearchRef.current;
    if (search?.trim()) params.set('search', search.trim());
    const { role, status } = state.filters;
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    return params;
  }, [limit, state.filters]);

  const fetchMembers = useCallback(async (isRefresh = false, page = 1, searchOverride?: string): Promise<void> => {
    if (!groupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setState(prev => ({ ...prev, loading: !isRefresh && page === 1, refreshing: isRefresh, error: null }));
    try {
      const params = buildQueryParams(page, searchOverride);
      const response = await apiClient.get(`/groups/${groupId}/members?${params.toString()}`);
      if (!mountedRef.current) return;
      if (response.data.success) {
        const newMembers: GroupMemberData[] = response.data.data || [];
        const pag: MembersPagination = response.data.pagination || { page, limit, total: newMembers.length, totalPages: 1, hasNextPage: false, hasPrevPage: page > 1 };
        setState(prev => ({ ...prev, members: isRefresh || page === 1 ? newMembers : [...prev.members, ...newMembers], loading: false, refreshing: false, hasMore: pag.hasNextPage, pagination: pag, error: null }));
      } else { throw new Error(response.data.error || 'Failed to fetch members'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, loading: false, refreshing: false, error: { message: err instanceof Error ? err.message : 'An error occurred', retryable: true } }));
    } finally { isFetchingRef.current = false; }
  }, [groupId, buildQueryParams]);

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.loading || !state.pagination) return;
    await fetchMembers(false, state.pagination.page + 1);
  }, [state.hasMore, state.loading, state.pagination, fetchMembers]);

  const refresh = useCallback(async (): Promise<void> => { await fetchMembers(true, 1); }, [fetchMembers]);

  const searchMembers = useCallback((query: string): void => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { debouncedSearchRef.current = query; fetchMembers(false, 1, query); }, searchDebounce);
  }, [searchDebounce, fetchMembers]);

  const setFilters = useCallback((newFilters: Partial<MembersFilters>): void => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, ...newFilters } }));
  }, []);

  const clearFilters = useCallback((): void => {
    setState(prev => ({ ...prev, filters: { ...defaultFilters }, searchQuery: '' }));
    debouncedSearchRef.current = '';
  }, []);

  const clearError = useCallback((): void => { setState(prev => ({ ...prev, error: null })); }, []);

  const updateMemberRole = useCallback(async (userId: string, newRole: MemberRole): Promise<boolean> => {
    if (!groupId) return false;
    const prevMembers = [...state.members];
    setState(prev => ({ ...prev, members: prev.members.map(m => m.userId === userId ? { ...m, role: newRole } : m) }));
    try {
      const response = await apiClient.put(`/groups/${groupId}/members/${userId}`, { role: newRole });
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to update role');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, members: prevMembers, error: { message: err instanceof Error ? err.message : 'Failed to update member role', retryable: true } }));
      return false;
    }
  }, [groupId, state.members]);

  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!groupId) return false;
    const prevMembers = [...state.members];
    setState(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== userId) }));
    try {
      const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to remove member');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, members: prevMembers, error: { message: err instanceof Error ? err.message : 'Failed to remove member', retryable: true } }));
      return false;
    }
  }, [groupId, state.members]);

  const banMember = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    if (!groupId) return false;
    const prevMembers = [...state.members];
    setState(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== userId) }));
    try {
      const response = await apiClient.post(`/groups/${groupId}/members/ban`, { userId, banReason: reason });
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to ban member');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, members: prevMembers, error: { message: err instanceof Error ? err.message : 'Failed to ban member', retryable: true } }));
      return false;
    }
  }, [groupId, state.members]);

  const unbanMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!groupId) return false;
    try {
      const response = await apiClient.post(`/groups/${groupId}/members/${userId}/unban`);
      if (!mountedRef.current) return false;
      if (response.data.success) { await refresh(); return true; }
      throw new Error(response.data.error || 'Failed to unban member');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, error: { message: err instanceof Error ? err.message : 'Failed to unban member', retryable: true } }));
      return false;
    }
  }, [groupId, refresh]);

  const inviteMember = useCallback(async (phone: string): Promise<boolean> => {
    if (!groupId) return false;
    try {
      const response = await apiClient.post(`/groups/invite`, { groupId, phone });
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to invite member');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, error: { message: err instanceof Error ? err.message : 'Failed to invite member', retryable: true } }));
      return false;
    }
  }, [groupId]);

  useEffect(() => { if (autoFetch && groupId) fetchMembers(false, 1); }, [state.filters]);  
  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch && groupId) fetchMembers(false, 1);
    return () => { mountedRef.current = false; if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [groupId]);  

  return {
    members: state.members, loading: state.loading, refreshing: state.refreshing, error: state.error, hasMore: state.hasMore, pagination: state.pagination, filters: state.filters,
    fetchMore, refresh, searchMembers, setFilters, clearFilters, clearError, updateMemberRole, removeMember, banMember, unbanMember, inviteMember,
  };
}

export default useGroupMembers;
