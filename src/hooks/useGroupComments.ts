'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupCommentData } from '@/types/group';

export interface CommentsError { message: string; code?: string; retryable?: boolean; }
export interface CommentsPagination { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; }
export interface UseGroupCommentsOptions { limit?: number; autoFetch?: boolean; sort?: 'oldest' | 'newest'; }
export interface AddCommentInput { content: string; parentId?: string | null; }

export interface UseGroupCommentsReturn {
  comments: GroupCommentData[]; loading: boolean; refreshing: boolean; error: CommentsError | null; hasMore: boolean; pagination: CommentsPagination | null;
  fetchMore: () => Promise<void>; refresh: () => Promise<void>; addComment: (i: AddCommentInput) => Promise<GroupCommentData | null>;
  editComment: (id: string, content: string) => Promise<boolean>; deleteComment: (id: string) => Promise<boolean>;
  likeComment: (id: string) => Promise<boolean>; unlikeComment: (id: string) => Promise<boolean>;
  markHelpful: (id: string, h: boolean) => Promise<boolean>; loadReplies: (id: string) => Promise<GroupCommentData[]>; clearError: () => void;
}

interface State { comments: GroupCommentData[]; loading: boolean; refreshing: boolean; error: CommentsError | null; hasMore: boolean; pagination: CommentsPagination | null; }

export function useGroupComments(groupId: string | null | undefined, postId: string | null | undefined, opts: UseGroupCommentsOptions = {}): UseGroupCommentsReturn {
  const { limit = 20, autoFetch = true, sort = 'oldest' } = opts;
  const [st, setSt] = useState<State>({ comments: [], loading: false, refreshing: false, error: null, hasMore: true, pagination: null });
  const fetchingRef = useRef(false);
  const mountRef = useRef(true);

  const fetchComments = useCallback(async (isRef = false, pg = 1) => {
    if (!groupId || !postId || fetchingRef.current) return;
    fetchingRef.current = true;
    setSt(p => ({ ...p, loading: !isRef && pg === 1, refreshing: isRef, error: null }));
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit), sort });
      const r = await apiClient.get(`/groups/${groupId}/posts/${postId}/comments?${params}`);
      if (!mountRef.current) return;
      if (r.data.success) {
        const data: GroupCommentData[] = r.data.data || [];
        const pag = r.data.pagination || { page: pg, limit, total: data.length, totalPages: 1, hasNextPage: false, hasPrevPage: pg > 1 };
        setSt(p => ({ ...p, comments: isRef || pg === 1 ? data : [...p.comments, ...data], loading: false, refreshing: false, hasMore: pag.hasNextPage, pagination: pag }));
      } else throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) setSt(p => ({ ...p, loading: false, refreshing: false, error: { message: e instanceof Error ? e.message : 'Error', retryable: true } }));
    } finally { fetchingRef.current = false; }
  }, [groupId, postId, limit, sort]);

  const fetchMore = useCallback(async () => { if (!st.hasMore || st.loading || !st.pagination) return; await fetchComments(false, st.pagination.page + 1); }, [st, fetchComments]);
  const refresh = useCallback(async () => { await fetchComments(true, 1); }, [fetchComments]);
  const clearError = useCallback(() => { setSt(p => ({ ...p, error: null })); }, []);

  const addComment = useCallback(async (input: AddCommentInput): Promise<GroupCommentData | null> => {
    if (!groupId || !postId) return null;
    try {
      const r = await apiClient.post(`/groups/${groupId}/posts/${postId}/comments`, input);
      if (!mountRef.current) return null;
      if (r.data.success) {
        const nc: GroupCommentData = r.data.data;
        if (input.parentId) {
          setSt(p => ({ ...p, comments: p.comments.map(c => c._id === input.parentId ? { ...c, replyCount: (c.replyCount || 0) + 1, replies: c.replies ? [...c.replies, nc] : [nc] } : c) }));
        } else {
          setSt(p => ({ ...p, comments: sort === 'oldest' ? [...p.comments, nc] : [nc, ...p.comments] }));
        }
        return nc;
      }
      throw new Error(r.data.error || 'Failed');
    } catch (e: unknown) {
      if (mountRef.current) setSt(p => ({ ...p, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return null;
    }
  }, [groupId, postId, sort]);

  const editComment = useCallback(async (commentId: string, content: string): Promise<boolean> => {
    if (!groupId || !postId) return false;
    const prev = [...st.comments];
    const upd = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
      if (c._id === commentId) return { ...c, content, isEdited: true, editedAt: new Date().toISOString() };
      if (c.replies?.length) return { ...c, replies: upd(c.replies) };
      return c;
    });
    setSt(p => ({ ...p, comments: upd(p.comments) }));
    try {
      const r = await apiClient.patch(`/groups/${groupId}/posts/${postId}/comments/${commentId}`, { content });
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error);
    } catch (e: unknown) {
      if (mountRef.current) setSt(p => ({ ...p, comments: prev, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return false;
    }
  }, [groupId, postId, st.comments]);

  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!groupId || !postId) return false;
    const prev = [...st.comments];
    const rem = (arr: GroupCommentData[]): GroupCommentData[] => arr.filter(c => c._id !== commentId).map(c => c.replies?.length ? { ...c, replies: rem(c.replies) } : c);
    setSt(p => ({ ...p, comments: rem(p.comments) }));
    try {
      const r = await apiClient.delete(`/groups/${groupId}/posts/${postId}/comments/${commentId}`);
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error);
    } catch (e: unknown) {
      if (mountRef.current) setSt(p => ({ ...p, comments: prev, error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return false;
    }
  }, [groupId, postId, st.comments]);

  const likeComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!groupId || !postId) return false;
    const upd = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
      if (c._id === commentId) return { ...c, isLiked: true, likesCount: (c.likesCount || 0) + 1 };
      if (c.replies?.length) return { ...c, replies: upd(c.replies) };
      return c;
    });
    setSt(p => ({ ...p, comments: upd(p.comments) }));
    try {
      const r = await apiClient.post(`/groups/${groupId}/posts/${postId}/comments/${commentId}/like`);
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error);
    } catch (e: unknown) {
      const rev = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
        if (c._id === commentId) return { ...c, isLiked: false, likesCount: Math.max(0, (c.likesCount || 0) - 1) };
        if (c.replies?.length) return { ...c, replies: rev(c.replies) };
        return c;
      });
      if (mountRef.current) setSt(p => ({ ...p, comments: rev(p.comments), error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return false;
    }
  }, [groupId, postId]);

  const unlikeComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!groupId || !postId) return false;
    const upd = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
      if (c._id === commentId) return { ...c, isLiked: false, likesCount: Math.max(0, (c.likesCount || 0) - 1) };
      if (c.replies?.length) return { ...c, replies: upd(c.replies) };
      return c;
    });
    setSt(p => ({ ...p, comments: upd(p.comments) }));
    try {
      const r = await apiClient.delete(`/groups/${groupId}/posts/${postId}/comments/${commentId}/like`);
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error);
    } catch (e: unknown) {
      const rev = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
        if (c._id === commentId) return { ...c, isLiked: true, likesCount: (c.likesCount || 0) + 1 };
        if (c.replies?.length) return { ...c, replies: rev(c.replies) };
        return c;
      });
      if (mountRef.current) setSt(p => ({ ...p, comments: rev(p.comments), error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return false;
    }
  }, [groupId, postId]);

  const markHelpful = useCallback(async (commentId: string, isHelpful: boolean): Promise<boolean> => {
    if (!groupId || !postId) return false;
    const upd = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
      if (c._id === commentId) return { ...c, isHelpful };
      if (c.replies?.length) return { ...c, replies: upd(c.replies) };
      return c;
    });
    setSt(p => ({ ...p, comments: upd(p.comments) }));
    try {
      const r = await apiClient.post(`/groups/${groupId}/posts/${postId}/comments/${commentId}/helpful`, { isHelpful });
      if (!mountRef.current) return false;
      if (r.data.success) return true;
      throw new Error(r.data.error);
    } catch (e: unknown) {
      const rev = (arr: GroupCommentData[]): GroupCommentData[] => arr.map(c => {
        if (c._id === commentId) return { ...c, isHelpful: !isHelpful };
        if (c.replies?.length) return { ...c, replies: rev(c.replies) };
        return c;
      });
      if (mountRef.current) setSt(p => ({ ...p, comments: rev(p.comments), error: { message: e instanceof Error ? e.message : 'Failed', retryable: true } }));
      return false;
    }
  }, [groupId, postId]);

  const loadReplies = useCallback(async (commentId: string): Promise<GroupCommentData[]> => {
    if (!groupId || !postId) return [];
    try {
      const r = await apiClient.get(`/groups/${groupId}/posts/${postId}/comments?parentId=${commentId}`);
      if (!mountRef.current) return [];
      if (r.data.success) {
        const replies: GroupCommentData[] = r.data.data || [];
        setSt(p => ({ ...p, comments: p.comments.map(c => c._id === commentId ? { ...c, replies } : c) }));
        return replies;
      }
      return [];
    } catch { return []; }
  }, [groupId, postId]);

  useEffect(() => {
    mountRef.current = true;
    if (autoFetch && groupId && postId) fetchComments(false, 1);
    return () => { mountRef.current = false; };
  }, [groupId, postId]);  

  return { comments: st.comments, loading: st.loading, refreshing: st.refreshing, error: st.error, hasMore: st.hasMore, pagination: st.pagination, fetchMore, refresh, addComment, editComment, deleteComment, likeComment, unlikeComment, markHelpful, loadReplies, clearError };
}

export default useGroupComments;