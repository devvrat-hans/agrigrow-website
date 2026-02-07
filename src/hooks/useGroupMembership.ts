/**
 * useGroupMembership Hook - Manages membership actions for a group
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { MemberRole, MemberStatus, GroupPrivacy } from '@/types/group';

export interface MembershipState {
  isMember: boolean;
  role: MemberRole | null;
  status: MemberStatus | null;
  joinedAt: string | null;
  isPending: boolean;
}

export interface MembershipError {
  message: string;
  code?: string;
  retryable?: boolean;
}

interface HookState {
  membership: MembershipState;
  loading: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  isRequesting: boolean;
  error: MembershipError | null;
}

export interface UseGroupMembershipOptions {
  autoFetch?: boolean;
  onJoinSuccess?: () => void;
  onLeaveSuccess?: () => void;
  onError?: (error: MembershipError) => void;
}

export interface UseGroupMembershipReturn {
  membership: MembershipState;
  loading: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  isRequesting: boolean;
  error: MembershipError | null;
  join: () => Promise<boolean>;
  leave: () => Promise<boolean>;
  requestToJoin: () => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
  setMembership: (membership: Partial<MembershipState>) => void;
}

const defaultMembership: MembershipState = {
  isMember: false,
  role: null,
  status: null,
  joinedAt: null,
  isPending: false,
};

export function useGroupMembership(
  groupId: string | null | undefined,
  groupPrivacy: GroupPrivacy | null | undefined = 'public',
  options: UseGroupMembershipOptions = {}
): UseGroupMembershipReturn {
  const { autoFetch = false, onJoinSuccess, onLeaveSuccess, onError } = options;

  const [state, setState] = useState<HookState>({
    membership: { ...defaultMembership },
    loading: false,
    isJoining: false,
    isLeaving: false,
    isRequesting: false,
    error: null,
  });

  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const handleError = useCallback((error: unknown, defaultMsg: string): MembershipError => {
    const errMsg = error instanceof Error ? error.message : defaultMsg;
    const membershipError: MembershipError = { message: errMsg, retryable: true };
    if (errMsg.includes('banned')) { membershipError.code = 'BANNED'; membershipError.retryable = false; }
    else if (errMsg.includes('pending')) { membershipError.code = 'PENDING'; membershipError.retryable = false; }
    else if (errMsg.includes('invite')) { membershipError.code = 'INVITE_REQUIRED'; membershipError.retryable = false; }
    else if (errMsg.includes('already')) { membershipError.code = 'ALREADY_MEMBER'; membershipError.retryable = false; }
    if (onError) onError(membershipError);
    return membershipError;
  }, [onError]);

  const fetchMembership = useCallback(async (): Promise<void> => {
    if (!groupId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiClient.get(`/groups/${groupId}`);
      if (!mountedRef.current) return;
      if (response.data.success) {
        const data = response.data.data;
        const membership: MembershipState = {
          isMember: data.isJoined || false,
          role: data.userRole || null,
          status: data.userMembershipStatus || null,
          joinedAt: null,
          isPending: data.userMembershipStatus === 'pending',
        };
        setState(prev => ({ ...prev, membership, loading: false }));
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, loading: false, error: handleError(err, 'Failed to fetch membership') }));
    } finally { isFetchingRef.current = false; }
  }, [groupId, handleError]);

  const join = useCallback(async (): Promise<boolean> => {
    if (!groupId || state.isJoining || state.membership.isMember || state.membership.isPending) return false;
    const isPublic = groupPrivacy === 'public';
    const prevMembership = { ...state.membership };
    setState(prev => ({
      ...prev, isJoining: true, error: null,
      membership: isPublic
        ? { isMember: true, role: 'member', status: 'active', joinedAt: new Date().toISOString(), isPending: false }
        : { ...prev.membership, isPending: true, status: 'pending' },
    }));
    try {
      const response = await apiClient.post(`/groups/${groupId}/members`);
      if (!mountedRef.current) return false;
      if (response.data.success) {
        const data = response.data.data;
        const newMembership: MembershipState = {
          isMember: data.status === 'active',
          role: data.role || 'member',
          status: data.status,
          joinedAt: data.joinedAt || new Date().toISOString(),
          isPending: data.status === 'pending',
        };
        setState(prev => ({ ...prev, isJoining: false, membership: newMembership }));
        if (onJoinSuccess && data.status === 'active') onJoinSuccess();
        return true;
      } else { throw new Error(response.data.error || 'Failed to join group'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isJoining: false, membership: prevMembership, error: handleError(err, 'Failed to join group') }));
      return false;
    }
  }, [groupId, groupPrivacy, state.isJoining, state.membership, handleError, onJoinSuccess]);

  const requestToJoin = useCallback(async (): Promise<boolean> => {
    if (!groupId || state.isRequesting || state.membership.isMember || state.membership.isPending) return false;
    if (groupPrivacy !== 'private') return join();
    const prevMembership = { ...state.membership };
    setState(prev => ({ ...prev, isRequesting: true, error: null, membership: { ...prev.membership, isPending: true, status: 'pending' } }));
    try {
      const response = await apiClient.post(`/groups/${groupId}/members`);
      if (!mountedRef.current) return false;
      if (response.data.success) {
        const data = response.data.data;
        setState(prev => ({
          ...prev, isRequesting: false,
          membership: { isMember: data.status === 'active', role: data.role || null, status: data.status, joinedAt: data.joinedAt || null, isPending: data.status === 'pending' },
        }));
        return true;
      } else { throw new Error(response.data.error || 'Failed to request to join'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isRequesting: false, membership: prevMembership, error: handleError(err, 'Failed to request to join group') }));
      return false;
    }
  }, [groupId, groupPrivacy, state.isRequesting, state.membership, join, handleError]);

  const leave = useCallback(async (): Promise<boolean> => {
    if (!groupId || state.isLeaving || !state.membership.isMember) return false;
    const prevMembership = { ...state.membership };
    setState(prev => ({ ...prev, isLeaving: true, error: null, membership: { ...defaultMembership } }));
    try {
      const response = await apiClient.delete(`/groups/${groupId}/members/me`);
      if (!mountedRef.current) return false;
      if (response.data.success) {
        setState(prev => ({ ...prev, isLeaving: false }));
        if (onLeaveSuccess) onLeaveSuccess();
        return true;
      } else { throw new Error(response.data.error || 'Failed to leave group'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, isLeaving: false, membership: prevMembership, error: handleError(err, 'Failed to leave group') }));
      return false;
    }
  }, [groupId, state.isLeaving, state.membership, handleError, onLeaveSuccess]);

  const refresh = useCallback(async (): Promise<void> => { await fetchMembership(); }, [fetchMembership]);
  const clearError = useCallback((): void => { setState(prev => ({ ...prev, error: null })); }, []);
  const setMembership = useCallback((membership: Partial<MembershipState>): void => {
    setState(prev => ({ ...prev, membership: { ...prev.membership, ...membership } }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch && groupId) fetchMembership();
    return () => { mountedRef.current = false; };
  }, [groupId]);  

  return {
    membership: state.membership, loading: state.loading, isJoining: state.isJoining, isLeaving: state.isLeaving, isRequesting: state.isRequesting, error: state.error,
    join, leave, requestToJoin, refresh, clearError, setMembership,
  };
}

export default useGroupMembership;
