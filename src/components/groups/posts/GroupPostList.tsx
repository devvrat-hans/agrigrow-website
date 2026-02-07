'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  IconRefresh,
  IconLoader2,
  IconAlertCircle,
  IconMessage2,
  IconChevronDown,
  IconChevronUp,
  IconArrowUp,
  IconMessageCircle,
  IconHelpCircle,
  IconSpeakerphone,
  IconChartBar,
  IconFileText,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GroupPostCard } from './GroupPostCard';
import {
  GroupPostData,
  GroupPostType,
  MemberRole,
} from '@/types/group';

/**
 * Post type filter configuration
 */
interface PostTypeFilter {
  id: GroupPostType | 'all';
  label: string;
  icon: React.ReactNode;
}

const postTypeFilters: PostTypeFilter[] = [
  { id: 'all', label: 'All', icon: <IconLayoutGrid className="w-4 h-4" /> },
  { id: 'discussion', label: 'Discussions', icon: <IconMessageCircle className="w-4 h-4" /> },
  { id: 'question', label: 'Questions', icon: <IconHelpCircle className="w-4 h-4" /> },
  { id: 'announcement', label: 'Announcements', icon: <IconSpeakerphone className="w-4 h-4" /> },
  { id: 'poll', label: 'Polls', icon: <IconChartBar className="w-4 h-4" /> },
  { id: 'resource', label: 'Resources', icon: <IconFileText className="w-4 h-4" /> },
];

/**
 * GroupPostList component props
 */
interface GroupPostListProps {
  /** Group ID */
  groupId: string;
  /** Initial posts data (optional, for SSR) */
  initialPosts?: GroupPostData[];
  /** Initial pinned posts data */
  initialPinnedPosts?: GroupPostData[];
  /** Current user's ID */
  currentUserId?: string;
  /** Current user's role in the group */
  currentUserRole?: MemberRole;
  /** Callback when a post is liked */
  onLike?: (postId: string) => Promise<void>;
  /** Callback when comment button is clicked */
  onComment?: (postId: string) => void;
  /** Callback when a post is shared */
  onShare?: (postId: string) => void;
  /** Callback when a post is deleted */
  onDelete?: (postId: string) => Promise<void>;
  /** Callback when edit is clicked */
  onEdit?: (postId: string) => void;
  /** Callback when pin is toggled */
  onPin?: (postId: string, isPinned: boolean) => Promise<void>;
  /** Callback when poll vote is cast */
  onVote?: (postId: string, optionIndex: number) => Promise<void>;
  /** Hook for fetching posts (for custom implementations) */
  useFetchPosts?: () => {
    posts: GroupPostData[];
    pinnedPosts: GroupPostData[];
    isLoading: boolean;
    isError: boolean;
    hasMore: boolean;
    newPostsCount: number;
    loadMore: () => void;
    refresh: () => void;
    fetchNewPosts: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for post cards
 */
function PostSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Avatar skeleton */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2 sm:space-y-3">
            {/* Name and badge */}
            <div className="flex items-center gap-2">
              <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 sm:h-4 w-12 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            
            {/* Content lines */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="h-3 sm:h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 sm:h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 sm:h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Image placeholder */}
            <div className="h-36 sm:h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />

            {/* Action bar */}
            <div className="flex items-center gap-3 sm:gap-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="h-7 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-7 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-7 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state component
 */
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <IconMessage2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
      </div>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
        No posts yet
      </h3>
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        {filter === 'all'
          ? 'Be the first to start a discussion in this community!'
          : `No ${filter} posts yet. Start the first one!`}
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <IconAlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
      </div>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
        Failed to load posts
      </h3>
      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
        Something went wrong. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline" className="min-h-[44px] active:scale-[0.95]">
        <IconRefresh className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Pinned posts section
 */
interface PinnedSectionProps {
  posts: GroupPostData[];
  isCollapsed: boolean;
  onToggle: () => void;
  currentUserId?: string;
  currentUserRole?: MemberRole;
  onLike?: (postId: string) => Promise<void>;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onEdit?: (postId: string) => void;
  onPin?: (postId: string, isPinned: boolean) => Promise<void>;
  onVote?: (postId: string, optionIndex: number) => Promise<void>;
}

function PinnedSection({
  posts,
  isCollapsed,
  onToggle,
  currentUserId,
  currentUserRole,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  onPin,
  onVote,
}: PinnedSectionProps) {
  if (posts.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 min-h-[44px] active:scale-[0.98]"
      >
        <span>📌 Pinned Posts ({posts.length})</span>
        {isCollapsed ? (
          <IconChevronDown className="w-4 h-4" />
        ) : (
          <IconChevronUp className="w-4 h-4" />
        )}
      </button>

      {!isCollapsed && (
        <div className="space-y-3 sm:space-y-4">
          {posts.map((post) => (
            <GroupPostCard
              key={post._id}
              post={post}
              currentUserId={currentUserId}
              groupId={post.groupId}
              currentUserRole={currentUserRole}
              isAuthor={currentUserId === post.author}
              onLike={onLike ? () => onLike(post._id) : undefined}
              onComment={onComment ? () => onComment(post._id) : undefined}
              onShare={onShare ? () => onShare(post._id) : undefined}
              onDelete={onDelete ? () => onDelete(post._id) : undefined}
              onEdit={onEdit ? () => onEdit(post._id) : undefined}
              onPin={onPin ? (id, isPinned) => onPin(id, isPinned) : undefined}
              onVote={onVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * GroupPostList component
 * 
 * Feed component for displaying group posts with all features.
 * 
 * Features:
 * - Pinned posts section at top (collapsible)
 * - Post type filter tabs
 * - Infinite scroll with Intersection Observer
 * - Pull-to-refresh on mobile
 * - Loading skeletons
 * - Empty state
 * - Error state with retry
 * - New posts available banner
 * - Optimistic updates for likes
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostList({
  groupId,
  initialPosts = [],
  initialPinnedPosts = [],
  currentUserId,
  currentUserRole,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  onPin,
  onVote,
  useFetchPosts,
  className,
}: GroupPostListProps) {
  // State
  const [posts, setPosts] = useState<GroupPostData[]>(initialPosts);
  const [pinnedPosts, setPinnedPosts] = useState<GroupPostData[]>(initialPinnedPosts);
  const [isLoading, setIsLoading] = useState(!initialPosts.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<GroupPostType | 'all'>('all');
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  
  // Refs
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Custom hook data (if provided)
  const customHookData = useFetchPosts?.();

  // Use custom hook data if provided
  useEffect(() => {
    if (customHookData) {
      setPosts(customHookData.posts);
      setPinnedPosts(customHookData.pinnedPosts);
      setIsLoading(customHookData.isLoading);
      setIsError(customHookData.isError);
      setHasMore(customHookData.hasMore);
      setNewPostsCount(customHookData.newPostsCount);
    }
  }, [customHookData]);

  // Filter posts by type
  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return posts;
    return posts.filter((post) => post.postType === activeFilter);
  }, [posts, activeFilter]);

  // Apply optimistic likes
  const postsWithOptimisticLikes = useMemo(() => {
    return filteredPosts.map((post) => {
      if (optimisticLikes[post._id] !== undefined) {
        return {
          ...post,
          isLiked: optimisticLikes[post._id],
          likesCount: optimisticLikes[post._id]
            ? post.likesCount + 1
            : Math.max(0, post.likesCount - 1),
        };
      }
      return post;
    });
  }, [filteredPosts, optimisticLikes]);

  // Fetch posts function
  const fetchPosts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (customHookData) return; // Skip if using custom hook

    try {
      if (pageNum === 1) {
        setIsLoading(true);
        setIsError(false);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });

      if (activeFilter !== 'all') {
        params.set('postType', activeFilter);
      }

      const phone = typeof window !== 'undefined' ? localStorage.getItem('userPhone') : null;
      const headers: Record<string, string> = {};
      if (phone) {
        headers['x-user-phone'] = phone;
      }

      const response = await fetch(`/api/groups/${groupId}/posts?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      const postsArray = data.data || data.posts || [];

      if (pageNum === 1 || isRefresh) {
        setPosts(postsArray);
        setPinnedPosts(data.pinnedPosts || []);
      } else {
        setPosts((prev) => [...prev, ...postsArray]);
      }

      setHasMore(data.pagination?.hasNextPage ?? data.pagination?.hasMore ?? data.hasMore ?? postsArray.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [groupId, activeFilter, customHookData]);

  // Initial fetch
  useEffect(() => {
    if (!customHookData && initialPosts.length === 0) {
      fetchPosts(1);
    }
  }, [fetchPosts, customHookData, initialPosts.length]);

  // Refetch when filter changes
  useEffect(() => {
    if (!customHookData) {
      fetchPosts(1);
    }
  }, [activeFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchPosts(page + 1);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, page, fetchPosts]);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.min(currentY - touchStartY.current, 100);
      if (distance > 0) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (customHookData) {
      customHookData.refresh();
    } else {
      await fetchPosts(1, true);
    }
  };

  // Handle like with optimistic update
  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;

    // Optimistic update
    const newLikedState = !post.isLiked;
    setOptimisticLikes((prev) => ({ ...prev, [postId]: newLikedState }));

    try {
      if (onLike) {
        await onLike(postId);
      }
      
      // Update actual state
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                isLiked: newLikedState,
                likesCount: newLikedState ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
              }
            : p
        )
      );
    } catch (_error) {
      // Revert optimistic update
      setOptimisticLikes((prev) => {
        const { [postId]: _, ...rest } = prev;
        return rest;
      });
    }

    // Clear optimistic state
    setTimeout(() => {
      setOptimisticLikes((prev) => {
        const { [postId]: _, ...rest } = prev;
        return rest;
      });
    }, 100);
  };

  // Fetch new posts
  const handleFetchNewPosts = () => {
    if (customHookData) {
      customHookData.fetchNewPosts();
    } else {
      fetchPosts(1, true);
    }
    setNewPostsCount(0);
  };

  return (
    <div
      ref={listRef}
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        ref={pullToRefreshRef}
        className={cn(
          'flex items-center justify-center overflow-hidden transition-all duration-200',
          'text-primary-600 dark:text-primary-400'
        )}
        style={{ height: pullDistance }}
      >
        {isRefreshing ? (
          <IconLoader2 className="w-6 h-6 animate-spin" />
        ) : (
          <IconArrowUp
            className={cn(
              'w-6 h-6 transition-transform',
              pullDistance > 60 && 'rotate-180'
            )}
          />
        )}
      </div>

      {/* New posts banner */}
      {newPostsCount > 0 && (
        <Button
          onClick={handleFetchNewPosts}
          className={cn(
            'w-full mb-3 sm:mb-4 py-2 sm:py-3 min-h-[44px]',
            'bg-primary-50 dark:bg-primary-900/30',
            'text-primary-700 dark:text-primary-300',
            'border border-primary-200 dark:border-primary-800',
            'hover:bg-primary-100 dark:hover:bg-primary-900/50',
            'active:scale-[0.98]'
          )}
          variant="ghost"
        >
          <IconArrowUp className="w-4 h-4 mr-2" />
          <span className="text-sm sm:text-base">{newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'} available</span>
        </Button>
      )}

      {/* Post type filter tabs */}
      <div className="mb-3 sm:mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 sm:gap-2 min-w-max pb-2">
          {postTypeFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 whitespace-nowrap min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm',
                activeFilter === filter.id && 'shadow-sm',
                'active:scale-[0.95]'
              )}
            >
              {filter.icon}
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Pinned posts section */}
      {pinnedPosts.length > 0 && activeFilter === 'all' && (
        <PinnedSection
          posts={pinnedPosts}
          isCollapsed={pinnedCollapsed}
          onToggle={() => setPinnedCollapsed(!pinnedCollapsed)}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onLike={handleLike}
          onComment={onComment}
          onShare={onShare}
          onDelete={onDelete}
          onEdit={onEdit}
          onPin={onPin}
          onVote={onVote}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3 sm:space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <ErrorState onRetry={() => fetchPosts(1)} />
      )}

      {/* Empty state */}
      {!isLoading && !isError && postsWithOptimisticLikes.length === 0 && (
        <EmptyState filter={activeFilter} />
      )}

      {/* Posts list */}
      {!isLoading && !isError && postsWithOptimisticLikes.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {postsWithOptimisticLikes.map((post) => (
            <GroupPostCard
              key={post._id}
              post={post}
              currentUserId={currentUserId}
              groupId={groupId}
              currentUserRole={currentUserRole}
              isAuthor={currentUserId === post.author}
              onLike={() => handleLike(post._id)}
              onComment={onComment ? () => onComment(post._id) : undefined}
              onShare={onShare ? () => onShare(post._id) : undefined}
              onDelete={onDelete ? () => onDelete(post._id) : undefined}
              onEdit={onEdit ? () => onEdit(post._id) : undefined}
              onPin={onPin}
              onVote={onVote}
            />
          ))}
        </div>
      )}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <IconLoader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && postsWithOptimisticLikes.length > 0 && !isLoading && (
        <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          You&apos;ve reached the end
        </div>
      )}
    </div>
  );
}

export default GroupPostList;
