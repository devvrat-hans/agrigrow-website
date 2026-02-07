/**
 * useGroupPosts Hook - Manages group posts feed with caching and mutations
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { GroupPostData, GroupPostType } from '@/types/group';

export interface PostsError {
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface PostsFilters {
  postType?: GroupPostType | null;
  sortBy?: 'recent' | 'popular' | 'commented';
}

export interface PostsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PostsState {
  posts: GroupPostData[];
  pinnedPosts: GroupPostData[];
  loading: boolean;
  refreshing: boolean;
  error: PostsError | null;
  hasMore: boolean;
  pagination: PostsPagination | null;
  filters: PostsFilters;
  newPostsCount: number;
}

export interface UseGroupPostsOptions {
  initialFilters?: PostsFilters;
  limit?: number;
  autoFetch?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export interface CreatePostInput {
  content: string;
  images?: string[];
  postType?: GroupPostType;
  poll?: { question: string; options: string[]; endDate?: string };
  tags?: string[];
}

export interface UseGroupPostsReturn {
  posts: GroupPostData[];
  pinnedPosts: GroupPostData[];
  loading: boolean;
  refreshing: boolean;
  error: PostsError | null;
  hasMore: boolean;
  pagination: PostsPagination | null;
  filters: PostsFilters;
  newPostsCount: number;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Partial<PostsFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  createPost: (input: CreatePostInput) => Promise<GroupPostData | null>;
  updatePost: (postId: string, updates: Partial<CreatePostInput>) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  likePost: (postId: string) => Promise<boolean>;
  unlikePost: (postId: string) => Promise<boolean>;
  pinPost: (postId: string, isPinned: boolean) => Promise<boolean>;
  approvePost: (postId: string) => Promise<boolean>;
  checkNewPosts: () => Promise<void>;
  clearNewPostsCount: () => void;
}

const postsCache = new Map<string, { posts: GroupPostData[]; pinnedPosts: GroupPostData[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const defaultFilters: PostsFilters = { postType: null, sortBy: 'recent' };

export function useGroupPosts(groupId: string | null | undefined, options: UseGroupPostsOptions = {}): UseGroupPostsReturn {
  const { initialFilters = {}, limit = 20, autoFetch = true, enablePolling = false, pollingInterval = 30000 } = options;
  const [state, setState] = useState<PostsState>({
    posts: [], pinnedPosts: [], loading: false, refreshing: false, error: null, hasMore: true,
    pagination: null, filters: { ...defaultFilters, ...initialFilters }, newPostsCount: 0,
  });
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const getCacheKey = useCallback((gId: string): string => `${gId}-${JSON.stringify(state.filters)}`, [state.filters]);

  const getCachedPosts = useCallback((gId: string): { posts: GroupPostData[]; pinnedPosts: GroupPostData[] } | null => {
    const cached = postsCache.get(getCacheKey(gId));
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return { posts: cached.posts, pinnedPosts: cached.pinnedPosts };
    postsCache.delete(getCacheKey(gId));
    return null;
  }, [getCacheKey]);

  const setCachedPosts = useCallback((gId: string, posts: GroupPostData[], pinnedPosts: GroupPostData[]): void => {
    postsCache.set(getCacheKey(gId), { posts, pinnedPosts, timestamp: Date.now() });
  }, [getCacheKey]);

  const invalidateCache = useCallback((gId: string): void => { postsCache.delete(getCacheKey(gId)); }, [getCacheKey]);

  const buildQueryParams = useCallback((page: number): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    const { postType, sortBy } = state.filters;
    if (postType) params.set('postType', postType);
    if (sortBy) params.set('sortBy', sortBy);
    return params;
  }, [limit, state.filters]);

  const fetchPosts = useCallback(async (isRefresh = false, page = 1): Promise<void> => {
    if (!groupId || isFetchingRef.current) return;
    if (!isRefresh && page === 1) {
      const cached = getCachedPosts(groupId);
      if (cached) { setState(prev => ({ ...prev, posts: cached.posts, pinnedPosts: cached.pinnedPosts, loading: false })); return; }
    }
    isFetchingRef.current = true;
    setState(prev => ({ ...prev, loading: !isRefresh && page === 1, refreshing: isRefresh, error: null }));
    try {
      const params = buildQueryParams(page);
      const response = await apiClient.get(`/groups/${groupId}/posts?${params.toString()}`);
      if (!mountedRef.current) return;
      if (response.data.success) {
        const allPosts: GroupPostData[] = response.data.data || [];
        const pinned = allPosts.filter(p => p.isPinned);
        const regular = allPosts.filter(p => !p.isPinned);
        const pag: PostsPagination = response.data.pagination || { page, limit, total: allPosts.length, totalPages: 1, hasNextPage: false, hasPrevPage: page > 1 };
        if (page === 1) setCachedPosts(groupId, regular, pinned);
        setState(prev => ({
          ...prev, posts: isRefresh || page === 1 ? regular : [...prev.posts, ...regular],
          pinnedPosts: isRefresh || page === 1 ? pinned : prev.pinnedPosts,
          loading: false, refreshing: false, hasMore: pag.hasNextPage, pagination: pag, error: null, newPostsCount: isRefresh ? 0 : prev.newPostsCount,
        }));
        lastFetchTimeRef.current = Date.now();
      } else { throw new Error(response.data.error || 'Failed to fetch posts'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, loading: false, refreshing: false, error: { message: err instanceof Error ? err.message : 'An error occurred', retryable: true } }));
    } finally { isFetchingRef.current = false; }
  }, [groupId, buildQueryParams, getCachedPosts, setCachedPosts]);

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.loading || !state.pagination) return;
    await fetchPosts(false, state.pagination.page + 1);
  }, [state.hasMore, state.loading, state.pagination, fetchPosts]);

  const refresh = useCallback(async (): Promise<void> => { if (groupId) invalidateCache(groupId); await fetchPosts(true, 1); }, [groupId, invalidateCache, fetchPosts]);

  const setFilters = useCallback((newFilters: Partial<PostsFilters>): void => { setState(prev => ({ ...prev, filters: { ...prev.filters, ...newFilters } })); }, []);
  const clearFilters = useCallback((): void => { setState(prev => ({ ...prev, filters: { ...defaultFilters } })); }, []);
  const clearError = useCallback((): void => { setState(prev => ({ ...prev, error: null })); }, []);
  const clearNewPostsCount = useCallback((): void => { setState(prev => ({ ...prev, newPostsCount: 0 })); }, []);

  const checkNewPosts = useCallback(async (): Promise<void> => {
    if (!groupId || !lastFetchTimeRef.current) return;
    try {
      const response = await apiClient.get(`/groups/${groupId}/posts?limit=1&since=${lastFetchTimeRef.current}`);
      if (!mountedRef.current) return;
      if (response.data.success && response.data.newCount) setState(prev => ({ ...prev, newPostsCount: response.data.newCount }));
    } catch { /* silent fail */ }
  }, [groupId]);

  const createPost = useCallback(async (input: CreatePostInput): Promise<GroupPostData | null> => {
    if (!groupId) return null;
    try {
      const response = await apiClient.post(`/groups/${groupId}/posts`, input);
      if (!mountedRef.current) return null;
      if (response.data.success) {
        const newPost: GroupPostData = response.data.data;
        if (groupId) invalidateCache(groupId);
        setState(prev => ({ ...prev, posts: [newPost, ...prev.posts] }));
        return newPost;
      } else { throw new Error(response.data.error || 'Failed to create post'); }
    } catch (err: unknown) {
      if (!mountedRef.current) return null;
      setState(prev => ({ ...prev, error: { message: err instanceof Error ? err.message : 'Failed to create post', retryable: true } }));
      return null;
    }
  }, [groupId, invalidateCache]);

  const updatePost = useCallback(async (postId: string, updates: Partial<CreatePostInput>): Promise<boolean> => {
    if (!groupId) return false;
    const prevPosts = [...state.posts];
    const prevPinned = [...state.pinnedPosts];
    const updateFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, content: updates.content ?? p.content, images: updates.images ?? p.images, postType: updates.postType ?? p.postType, tags: updates.tags ?? p.tags, isEdited: true, editedAt: new Date().toISOString() } : p);
    setState(prev => ({ ...prev, posts: updateFn(prev.posts), pinnedPosts: updateFn(prev.pinnedPosts) }));
    try {
      const response = await apiClient.patch(`/groups/${groupId}/posts/${postId}`, updates);
      if (!mountedRef.current) return false;
      if (response.data.success) { if (groupId) invalidateCache(groupId); return true; }
      throw new Error(response.data.error || 'Failed to update post');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, posts: prevPosts, pinnedPosts: prevPinned, error: { message: err instanceof Error ? err.message : 'Failed to update post', retryable: true } }));
      return false;
    }
  }, [groupId, state.posts, state.pinnedPosts, invalidateCache]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId) return false;
    const prevPosts = [...state.posts];
    const prevPinned = [...state.pinnedPosts];
    setState(prev => ({ ...prev, posts: prev.posts.filter(p => p._id !== postId), pinnedPosts: prev.pinnedPosts.filter(p => p._id !== postId) }));
    try {
      const response = await apiClient.delete(`/groups/${groupId}/posts/${postId}`);
      if (!mountedRef.current) return false;
      if (response.data.success) { if (groupId) invalidateCache(groupId); return true; }
      throw new Error(response.data.error || 'Failed to delete post');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, posts: prevPosts, pinnedPosts: prevPinned, error: { message: err instanceof Error ? err.message : 'Failed to delete post', retryable: true } }));
      return false;
    }
  }, [groupId, state.posts, state.pinnedPosts, invalidateCache]);

  const likePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId) return false;
    const updateFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isLiked: true, likesCount: (p.likesCount || 0) + 1 } : p);
    setState(prev => ({ ...prev, posts: updateFn(prev.posts), pinnedPosts: updateFn(prev.pinnedPosts) }));
    try {
      const response = await apiClient.post(`/groups/${groupId}/posts/${postId}/like`);
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to like post');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      const revertFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p);
      setState(prev => ({ ...prev, posts: revertFn(prev.posts), pinnedPosts: revertFn(prev.pinnedPosts), error: { message: err instanceof Error ? err.message : 'Failed to like post', retryable: true } }));
      return false;
    }
  }, [groupId]);

  const unlikePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId) return false;
    const updateFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isLiked: false, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p);
    setState(prev => ({ ...prev, posts: updateFn(prev.posts), pinnedPosts: updateFn(prev.pinnedPosts) }));
    try {
      const response = await apiClient.delete(`/groups/${groupId}/posts/${postId}/like`);
      if (!mountedRef.current) return false;
      if (response.data.success) return true;
      throw new Error(response.data.error || 'Failed to unlike post');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      const revertFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isLiked: true, likesCount: (p.likesCount || 0) + 1 } : p);
      setState(prev => ({ ...prev, posts: revertFn(prev.posts), pinnedPosts: revertFn(prev.pinnedPosts), error: { message: err instanceof Error ? err.message : 'Failed to unlike post', retryable: true } }));
      return false;
    }
  }, [groupId]);

  const pinPost = useCallback(async (postId: string, isPinned: boolean): Promise<boolean> => {
    if (!groupId) return false;
    const prevPosts = [...state.posts];
    const prevPinned = [...state.pinnedPosts];
    if (isPinned) {
      const post = state.posts.find(p => p._id === postId);
      if (post) setState(prev => ({ ...prev, posts: prev.posts.filter(p => p._id !== postId), pinnedPosts: [{ ...post, isPinned: true }, ...prev.pinnedPosts] }));
    } else {
      const post = state.pinnedPosts.find(p => p._id === postId);
      if (post) setState(prev => ({ ...prev, pinnedPosts: prev.pinnedPosts.filter(p => p._id !== postId), posts: [{ ...post, isPinned: false }, ...prev.posts] }));
    }
    try {
      const response = await apiClient.post(`/groups/${groupId}/posts/${postId}/pin`, { isPinned });
      if (!mountedRef.current) return false;
      if (response.data.success) { if (groupId) invalidateCache(groupId); return true; }
      throw new Error(response.data.error || 'Failed to update pin status');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      setState(prev => ({ ...prev, posts: prevPosts, pinnedPosts: prevPinned, error: { message: err instanceof Error ? err.message : 'Failed to update pin status', retryable: true } }));
      return false;
    }
  }, [groupId, state.posts, state.pinnedPosts, invalidateCache]);

  const approvePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!groupId) return false;
    const updateFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isApproved: true } : p);
    setState(prev => ({ ...prev, posts: updateFn(prev.posts), pinnedPosts: updateFn(prev.pinnedPosts) }));
    try {
      const response = await apiClient.post(`/groups/${groupId}/posts/${postId}/approve`);
      if (!mountedRef.current) return false;
      if (response.data.success) { if (groupId) invalidateCache(groupId); return true; }
      throw new Error(response.data.error || 'Failed to approve post');
    } catch (err: unknown) {
      if (!mountedRef.current) return false;
      const revertFn = (posts: GroupPostData[]) => posts.map(p => p._id === postId ? { ...p, isApproved: false } : p);
      setState(prev => ({ ...prev, posts: revertFn(prev.posts), pinnedPosts: revertFn(prev.pinnedPosts), error: { message: err instanceof Error ? err.message : 'Failed to approve post', retryable: true } }));
      return false;
    }
  }, [groupId, invalidateCache]);

  useEffect(() => { if (autoFetch && groupId) fetchPosts(false, 1); }, [state.filters]);  

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch && groupId) fetchPosts(false, 1);
    if (enablePolling && groupId) { pollingRef.current = setInterval(checkNewPosts, pollingInterval); }
    return () => { mountedRef.current = false; if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [groupId]);  

  return {
    posts: state.posts, pinnedPosts: state.pinnedPosts, loading: state.loading, refreshing: state.refreshing, error: state.error, hasMore: state.hasMore, pagination: state.pagination, filters: state.filters, newPostsCount: state.newPostsCount,
    fetchMore, refresh, setFilters, clearFilters, clearError, createPost, updatePost, deletePost, likePost, unlikePost, pinPost, approvePost, checkNewPosts, clearNewPostsCount,
  };
}

export default useGroupPosts;
