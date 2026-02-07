'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupPostData, MemberRole } from '@/types/group';

export interface ModerationError { message: string; code?: string; retryable?: boolean; }
export interface PendingPost extends GroupPostData { requestedAt?: string; }
export interface JoinRequest { _id: string; userId: string; user?: { _id: string; fullName: string; profileImage?: string; }; requestedAt: string; message?: string; }

interface State {
  pendingPosts: PendingPost[]; loadingPosts: boolean;
  pendingJoinRequests: JoinRequest[]; loadingRequests: boolean;
  error: ModerationError | null; userRole: MemberRole | null;
}

export interface UseGroupModerationOptions { autoFetch?: boolean; }

export interface UseGroupModerationReturn {
  pendingPosts: PendingPost[]; loadingPosts: boolean;
  pendingJoinRequests: JoinRequest[]; loadingRequests: boolean;
  error: ModerationError | null; userRole: MemberRole | null; isModerator: boolean;
  loadPendingPosts: () => Promise<void>; approvePost: (postId: string) => Promise<boolean>; rejectPost: (postId: string) => Promise<boolean>;
  loadJoinRequests: () => Promise<void>; approveJoinRequest: (userId: string) => Promise<boolean>; rejectJoinRequest: (userId: string) => Promise<boolean>;
  batchApprovePosts: (postIds: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchRejectPosts: (postIds: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchApproveRequests: (userIds: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchRejectRequests: (userIds: string[]) => Promise<{ success: string[]; failed: string[] }>;
  clearError: () => void; refresh: () => Promise<void>;
}

const MODERATOR_ROLES: MemberRole[] = ['moderator', 'admin', 'owner'];

export function useGroupModeration(groupId: string | null | undefined, opts: UseGroupModerationOptions = {}): UseGroupModerationReturn {
  const { autoFetch = false } = opts;
  const [st, setSt] = useState<State>({ pendingPosts: [], loadingPosts: false, pendingJoinRequests: [], loadingRequests: false, error: null, userRole: null });
  const mountRef = useRef(true);
  const fetchingPostsRef = useRef(false);
  const fetchingRequestsRef = useRef(false);

  const isModerator = st.userRole ? MODERATOR_ROLES.includes(st.userRole) : false;

  const fetchUserRole = useCallback(async () => {
    if (!groupId) return;
    try {
      const r = await apiClient.get(`/groups/${groupId}`);
      if (!mountRef.current) return;
      if (r.data.success && r.data.data?.userRole) { setSt(p => ({ ...p, userRole: r.data.data.userRole })); }
    } catch { /* ignore */ }
  }, [groupId]);

  const loadPendingPosts = useCallback(async () => {
    if (!groupId || !isModerator || fetchingPostsRef.current) return;
    fetchingPostsRef.current = true;
    setSt(p => ({ ...p, loadingPosts: true, error: null }));
    try {
      const r = await apiClient.get(`/groups/${groupId}/posts?isApproved=false`);
      if (!mountRef.current) return;
      if (r.data.success) {
        const posts: PendingPost[] = (r.data.data || []).filter((p: GroupPostData) => !p.isApproved);
        setSt(p => ({ ...p, pendingPosts: posts, loadingPosts: false }));
      } else throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) { if (mountRef.current) setSt(p => ({ ...p, loadingPosts: false, error: { message: e instanceof Error ? e.message : 'Error', retryable: true } })); }
    finally { fetchingPostsRef.current = false; }
  }, [groupId, isModerator]);

  const loadJoinRequests = useCallback(async () => {
    if (!groupId || !isModerator || fetchingRequestsRef.current) return;
    fetchingRequestsRef.current = true;
    setSt(p => ({ ...p, loadingRequests: true, error: null }));
    try {
      const r = await apiClient.get(`/groups/${groupId}/join-requests`);
      if (!mountRef.current) return;
      if (r.data.success) { setSt(p => ({ ...p, pendingJoinRequests: r.data.data || [], loadingRequests: false })); }
      else throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) { if (mountRef.current) setSt(p => ({ ...p, loadingRequests: false, error: { message: e instanceof Error ? e.message : 'Error', retryable: true } })); }
    finally { fetchingRequestsRef.current = false; }
  }, [groupId, isModerator]);

  const approvePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId || !isModerator) return false;
    setSt(p => ({ ...p, pendingPosts: p.pendingPosts.filter(post => post._id !== postId) }));
    try {
      const r = await apiClient.post(`/groups/${groupId}/posts/${postId}/approve`);
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) { await loadPendingPosts(); setSt(p => ({ ...p, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } })); }
      return false;
    }
  }, [groupId, isModerator, loadPendingPosts]);

  const rejectPost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId || !isModerator) return false;
    setSt(p => ({ ...p, pendingPosts: p.pendingPosts.filter(post => post._id !== postId) }));
    try {
      const r = await apiClient.delete(`/groups/${groupId}/posts/${postId}`);
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) { await loadPendingPosts(); setSt(p => ({ ...p, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } })); }
      return false;
    }
  }, [groupId, isModerator, loadPendingPosts]);

  const approveJoinRequest = useCallback(async (userId: string): Promise<boolean> => {
    if (!groupId || !isModerator) return false;
    setSt(p => ({ ...p, pendingJoinRequests: p.pendingJoinRequests.filter(req => req.userId !== userId) }));
    try {
      const r = await apiClient.post(`/groups/${groupId}/join-requests`, { userId, action: 'approve' });
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) { await loadJoinRequests(); setSt(p => ({ ...p, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } })); }
      return false;
    }
  }, [groupId, isModerator, loadJoinRequests]);

  const rejectJoinRequest = useCallback(async (userId: string): Promise<boolean> => {
    if (!groupId || !isModerator) return false;
    setSt(p => ({ ...p, pendingJoinRequests: p.pendingJoinRequests.filter(req => req.userId !== userId) }));
    try {
      const r = await apiClient.post(`/groups/${groupId}/join-requests`, { userId, action: 'reject' });
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) { await loadJoinRequests(); setSt(p => ({ ...p, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } })); }
      return false;
    }
  }, [groupId, isModerator, loadJoinRequests]);

  const batchApprovePosts = useCallback(async (postIds: string[]): Promise<{ success: string[]; failed: string[] }> => {
    const results = { success: [] as string[], failed: [] as string[] };
    for (const id of postIds) { if (await approvePost(id)) { results.success.push(id); } else { results.failed.push(id); } }
    return results;
  }, [approvePost]);

  const batchRejectPosts = useCallback(async (postIds: string[]): Promise<{ success: string[]; failed: string[] }> => {
    const results = { success: [] as string[], failed: [] as string[] };
    for (const id of postIds) { if (await rejectPost(id)) { results.success.push(id); } else { results.failed.push(id); } }
    return results;
  }, [rejectPost]);

  const batchApproveRequests = useCallback(async (userIds: string[]): Promise<{ success: string[]; failed: string[] }> => {
    const results = { success: [] as string[], failed: [] as string[] };
    for (const id of userIds) { if (await approveJoinRequest(id)) { results.success.push(id); } else { results.failed.push(id); } }
    return results;
  }, [approveJoinRequest]);

  const batchRejectRequests = useCallback(async (userIds: string[]): Promise<{ success: string[]; failed: string[] }> => {
    const results = { success: [] as string[], failed: [] as string[] };
    for (const id of userIds) { if (await rejectJoinRequest(id)) { results.success.push(id); } else { results.failed.push(id); } }
    return results;
  }, [rejectJoinRequest]);

  const clearError = useCallback(() => { setSt(p => ({ ...p, error: null })); }, []);
  const refresh = useCallback(async () => { await Promise.all([loadPendingPosts(), loadJoinRequests()]); }, [loadPendingPosts, loadJoinRequests]);

  useEffect(() => { mountRef.current = true; if (groupId) fetchUserRole(); return () => { mountRef.current = false; }; }, [groupId, fetchUserRole]);
  useEffect(() => { if (autoFetch && isModerator) { loadPendingPosts(); loadJoinRequests(); } }, [autoFetch, isModerator, loadPendingPosts, loadJoinRequests]);

  return {
    pendingPosts: st.pendingPosts, loadingPosts: st.loadingPosts, pendingJoinRequests: st.pendingJoinRequests, loadingRequests: st.loadingRequests,
    error: st.error, userRole: st.userRole, isModerator, loadPendingPosts, approvePost, rejectPost, loadJoinRequests, approveJoinRequest, rejectJoinRequest,
    batchApprovePosts, batchRejectPosts, batchApproveRequests, batchRejectRequests, clearError, refresh,
  };
}

export default useGroupModeration;