/**
 * useGroup Hook - Manages single group data with membership actions
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupData, MemberRole, GroupSettings, GroupRule } from '@/types/group';

export interface GroupError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface UserMembership {
  isMember: boolean;
  role: MemberRole | null;
  joinedAt: string | null;
  isPending: boolean;
}

interface GroupState {
  group: GroupData | null;
  membership: UserMembership;
  loading: boolean;
  refreshing: boolean;
  error: GroupError | null;
  isJoining: boolean;
  isLeaving: boolean;
  isUpdating: boolean;
}

export interface UseGroupOptions {
  autoFetch?: boolean;
  includeMembers?: boolean;
  membersLimit?: number;
}

export interface UseGroupReturn {
  group: GroupData | null;
  membership: UserMembership;
  loading: boolean;
  refreshing: boolean;
  error: GroupError | null;
  isJoining: boolean;
  isLeaving: boolean;
  isUpdating: boolean;
  refresh: () => Promise<void>;
  join: () => Promise<boolean>;
  leave: () => Promise<boolean>;
  updateSettings: (settings: Partial<GroupSettings>) => Promise<boolean>;
  updateGroup: (updates: Partial<GroupData>) => Promise<boolean>;
  updateRules: (rules: GroupRule[]) => Promise<boolean>;
  clearError: () => void;
  retry: () => Promise<void>;
  setGroup: (group: GroupData | null) => void;
  setMembership: (membership: Partial<UserMembership>) => void;
}

const groupCache = new Map<string, { group: GroupData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const defaultMembership: UserMembership = { isMember: false, role: null, joinedAt: null, isPending: false };

export function useGroup(groupIdOrSlug: string | null | undefined, options: UseGroupOptions = {}): UseGroupReturn {
  const { autoFetch = true, includeMembers = false, membersLimit = 10 } = options;
  const [state, setState] = useState<GroupState>({
    group: null, membership: { ...defaultMembership }, loading: false, refreshing: false, error: null, isJoining: false, isLeaving: false, isUpdating: false,
  });
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchIdRef = useRef<string | null>(null);

  const getCachedGroup = useCallback((id: string): GroupData | null => {
    const cached = groupCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.group;
    groupCache.delete(id);
    return null;
  }, []);

  const setCachedGroup = useCallback((id: string, group: GroupData): void => {
    groupCache.set(id, { group, timestamp: Date.now() });
  }, []);

  const invalidateCache = useCallback((id: string): void => {
    groupCache.delete(id);
  }, []);

  const fetchGroup = useCallback(async (isRefresh = false): Promise<void> => {
    if (!groupIdOrSlug || isFetchingRef.current) return;
    if (!isRefresh) {
      const cached = getCachedGroup(groupIdOrSlug);
      if (cached) { setState(prev => ({ ...prev, group: cached, loading: false })); return; }
    }
    isFetchingRef.current = true;
    lastFetchIdRef.current = groupIdOrSlug;
    setState(prev => ({ ...prev, loading: !isRefresh, refreshing: isRefresh, error: null }));
    try {
      const params = new URLSearchParams();
      if (includeMembers) { params.set('includeMembers', 'true'); params.set('membersLimit', String(membersLimit)); }
      const url = `/api/groups/${groupIdOrSlug}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      if (!mountedRef.current || lastFetchIdRef.current !== groupIdOrSlug) return;
      if (response.data.success) {
        const groupData: GroupData = response.data.data;
        const membershipData: UserMembership = response.data.membership || { ...defaultMembership };
        setCachedGroup(groupIdOrSlug, groupData);
        setState(prev => ({ ...prev, group: groupData, membership: membershipData, loading: false, refreshing: false, error: null }));
      } else { throw new Error(response.data.error || 'Failed to fetch group'); }
    } catch (err: unknown) {
      if (!mountedRef.current || lastFetchIdRef.current !== groupIdOrSlug) return;
      const errMsg = err instanceof Error ? err.message : 'An error occurred';
      const is404 = errMsg.includes('not found') || errMsg.includes('404');
      setState(prev => ({ ...prev, loading: false, refreshing: false, error: { message: errMsg, code: is404 ? 'NOT_FOUND' : 'FETCH_ERROR', retryable: !is404 } }));
    } finally { isFetchingRef.current = false; }
  }, [groupIdOrSlug, includeMembers, membersLimit, getCachedGroup, setCachedGroup]);

  const refresh = useCallback(async (): Promise<void> => {
    if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
    await fetchGroup(true);
  }, [groupIdOrSlug, invalidateCache, fetchGroup]);

  const join = useCallback(async (): Promise<boolean> => {
    if (!groupIdOrSlug || state.isJoining || state.membership.isMember) return false;
    const prevMembership = { ...state.membership };
    const requiresApproval = state.group?.privacy === 'private' || state.group?.privacy === 'invite-only';
    setState(prev => ({
      ...prev, isJoining: true,
      membership: requiresApproval ? { ...prev.membership, isPending: true } : { isMember: true, role: 'member' as MemberRole, joinedAt: new Date().toISOString(), isPending: false },
      group: prev.group ? { ...prev.group, memberCount: (prev.group.memberCount || 0) + (requiresApproval ? 0 : 1) } : null,
    }));
    try {
      const response = await apiClient.post(`/groups/${groupIdOrSlug}/members`, { action: 'join' });
      if (!mountedRef.current) return false;
      if (response.data.success) {
        if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
        const newMembership = response.data.membership || (requiresApproval ? { ...defaultMembership, isPending: true } : { isMember: true, role: 'member' as MemberRole, joinedAt: new Date().toISOString(), isPending: false });
        setState(prev => ({ ...prev, isJoining: false, membership: newMembership }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to join group'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isJoining: false, membership: prevMembership, group: prev.group ? { ...prev.group, memberCount: state.group?.memberCount || prev.group.memberCount } : null, error: { message: err instanceof Error ? err.message : 'Failed to join group', retryable: true } }));
      return false;
    }
  }, [groupIdOrSlug, state.isJoining, state.membership, state.group, invalidateCache]);

  const leave = useCallback(async (): Promise<boolean> => {
    if (!groupIdOrSlug || state.isLeaving || !state.membership.isMember) return false;
    const prevMembership = { ...state.membership };
    const prevMemberCount = state.group?.memberCount || 0;
    setState(prev => ({
      ...prev, isLeaving: true,
      membership: { ...defaultMembership },
      group: prev.group ? { ...prev.group, memberCount: Math.max(0, (prev.group.memberCount || 0) - 1) } : null,
    }));
    try {
      const response = await apiClient.delete(`/groups/${groupIdOrSlug}/members`);
      if (!mountedRef.current) return false;
      if (response.data.success) {
        if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
        setState(prev => ({ ...prev, isLeaving: false }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to leave group'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isLeaving: false, membership: prevMembership, group: prev.group ? { ...prev.group, memberCount: prevMemberCount } : null, error: { message: err instanceof Error ? err.message : 'Failed to leave group', retryable: true } }));
      return false;
    }
  }, [groupIdOrSlug, state.isLeaving, state.membership, state.group, invalidateCache]);

  const updateSettings = useCallback(async (settings: Partial<GroupSettings>): Promise<boolean> => {
    if (!groupIdOrSlug || state.isUpdating) return false;
    const prevGroup = state.group;
    setState(prev => ({ ...prev, isUpdating: true, group: prev.group ? { ...prev.group, settings: { ...prev.group.settings, ...settings } } : null }));
    try {
      const response = await apiClient.patch(`/groups/${groupIdOrSlug}/settings`, { settings });
      if (!mountedRef.current) return false;
      if (response.data.success) {
        if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
        setState(prev => ({ ...prev, isUpdating: false, group: response.data.data || prev.group }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to update settings'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isUpdating: false, group: prevGroup, error: { message: err instanceof Error ? err.message : 'Failed to update settings', retryable: true } }));
      return false;
    }
  }, [groupIdOrSlug, state.isUpdating, state.group, invalidateCache]);

  const updateGroup = useCallback(async (updates: Partial<GroupData>): Promise<boolean> => {
    if (!groupIdOrSlug || state.isUpdating) return false;
    const prevGroup = state.group;
    setState(prev => ({ ...prev, isUpdating: true, group: prev.group ? { ...prev.group, ...updates } : null }));
    try {
      const response = await apiClient.patch(`/groups/${groupIdOrSlug}`, updates);
      if (!mountedRef.current) return false;
      if (response.data.success) {
        if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
        setState(prev => ({ ...prev, isUpdating: false, group: response.data.data || prev.group }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to update group'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isUpdating: false, group: prevGroup, error: { message: err instanceof Error ? err.message : 'Failed to update group', retryable: true } }));
      return false;
    }
  }, [groupIdOrSlug, state.isUpdating, state.group, invalidateCache]);

  const updateRules = useCallback(async (rules: GroupRule[]): Promise<boolean> => {
    if (!groupIdOrSlug || state.isUpdating) return false;
    const prevGroup = state.group;
    setState(prev => ({ ...prev, isUpdating: true, group: prev.group ? { ...prev.group, rules } : null }));
    try {
      const response = await apiClient.patch(`/groups/${groupIdOrSlug}/rules`, { rules });
      if (!mountedRef.current) return false;
      if (response.data.success) {
        if (groupIdOrSlug) invalidateCache(groupIdOrSlug);
        setState(prev => ({ ...prev, isUpdating: false, group: response.data.data || prev.group }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to update rules'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isUpdating: false, group: prevGroup, error: { message: err instanceof Error ? err.message : 'Failed to update rules', retryable: true } }));
      return false;
    }
  }, [groupIdOrSlug, state.isUpdating, state.group, invalidateCache]);

  const clearError = useCallback((): void => { setState(prev => ({ ...prev, error: null })); }, []);
  const retry = useCallback(async (): Promise<void> => { await fetchGroup(false); }, [fetchGroup]);
  const setGroup = useCallback((group: GroupData | null): void => { setState(prev => ({ ...prev, group })); if (group && groupIdOrSlug) setCachedGroup(groupIdOrSlug, group); }, [groupIdOrSlug, setCachedGroup]);
  const setMembership = useCallback((membership: Partial<UserMembership>): void => { setState(prev => ({ ...prev, membership: { ...prev.membership, ...membership } })); }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch && groupIdOrSlug) { fetchGroup(false); }
    return () => { mountedRef.current = false; };
  }, [groupIdOrSlug]);  

  useEffect(() => {
    if (!groupIdOrSlug) { setState(prev => ({ ...prev, group: null, membership: { ...defaultMembership }, loading: false, error: null })); }
  }, [groupIdOrSlug]);

  return {
    group: state.group, membership: state.membership, loading: state.loading, refreshing: state.refreshing, error: state.error, isJoining: state.isJoining, isLeaving: state.isLeaving, isUpdating: state.isUpdating,
    refresh, join, leave, updateSettings, updateGroup, updateRules, clearError, retry, setGroup, setMembership,
  };
}

export default useGroup;
