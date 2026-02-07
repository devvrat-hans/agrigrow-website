'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Component,
  ReactNode,
} from 'react';
import {
  IconRefresh,
  IconMoodEmpty,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { FeedItemCard, type FeedItemData } from './FeedItemCard';
import { SwipeableCard } from './SwipeableCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { calculateVisibleRange, getSpacerHeights, trackRender } from '@/lib/performance';
import { useViewTracking } from '@/hooks/useViewTracking';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Props for FeedList component
 */
interface FeedListProps {
  /** Array of feed items */
  posts: FeedItemData[];
  /** Current user ID for checking if liked */
  currentUserId?: string | null;
  /** Load more posts callback */
  onLoadMore?: () => void;
  /** Whether there are more posts to load */
  hasMore?: boolean;
  /** Whether posts are loading */
  isLoading?: boolean;
  /** Whether initial loading is in progress */
  isInitialLoading?: boolean;
  /** Refresh posts callback */
  onRefresh?: () => void;
  /** Like button handler */
  onLike?: (postId: string, isLiked: boolean, likesCount: number) => void;
  /** Comment button handler */
  onComment?: (postId: string) => void;
  /** Share button handler */
  onShare?: (postId: string) => void;
  /** Report button handler */
  onReport?: (postId: string) => void;
  /** Hide button handler */
  onHide?: (postId: string) => void;
  /** Delete button handler */
  onDelete?: (postId: string) => Promise<boolean>;
  /** Save button handler */
  onSave?: (postId: string) => Promise<{ isSaved: boolean; message: string } | null>;
  /** Check if post is saved */
  isPostSaved?: (postId: string) => boolean;
  /** Callback when a user is muted from the post menu */
  onMuteUser?: (authorId: string) => void;
  /** Enable swipe gestures on mobile */
  enableSwipeGestures?: boolean;
  /** Enable virtualization for performance (recommended for large lists) */
  enableVirtualization?: boolean;
  /** Estimated item height for virtualization */
  estimatedItemHeight?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Error Boundary for individual feed items
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  postId: string;
  errorMessage?: string;
}

class FeedItemErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in post ${this.props.postId}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <IconAlertTriangle size={18} />
              <span className="text-sm">{this.props.errorMessage || 'Failed to load this post'}</span>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Skeleton card component for loading state
 * Responsive dimensions matching FeedItemCard
 */
function FeedItemSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 animate-pulse">
      {/* Header skeleton - responsive avatar */}
      <div className="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {/* Menu button skeleton */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      
      {/* Content skeleton - responsive widths */}
      <div className="space-y-2 sm:space-y-2 mb-3 sm:mb-4">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-[85%] sm:w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-[60%] sm:w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Tags skeleton */}
      <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
        <div className="h-5 sm:h-6 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-5 sm:h-6 w-12 sm:w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      
      {/* Image skeleton - responsive aspect ratio maintained */}
      <div className="aspect-[4/3] sm:aspect-video w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 sm:mb-4" />
      
      {/* Actions skeleton - responsive heights for touch targets */}
      <div className="flex items-center gap-2 sm:gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex-1" />
        <div className="h-9 sm:h-8 w-9 sm:w-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * Pull to refresh threshold in pixels
 */
const PULL_THRESHOLD = 80;

/**
 * ViewTrackingWrapper Component
 * Uses IntersectionObserver to track when a post becomes visible in the viewport
 */
interface ViewTrackingWrapperProps {
  postId: string;
  onVisible: (postId: string) => void;
  children: ReactNode;
}

function ViewTrackingWrapper({ postId, onVisible, children }: ViewTrackingWrapperProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Track when at least 50% of the post is visible
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !hasTrackedRef.current) {
          hasTrackedRef.current = true;
          onVisible(postId);
          // Disconnect after tracking - each post only tracked once per session
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [postId, onVisible]);

  return <div ref={elementRef}>{children}</div>;
}

/**
 * FeedList Component
 * Production-ready infinite scroll feed with pull-to-refresh, virtualization, and error boundaries
 */
export function FeedList({
  posts,
  currentUserId,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isInitialLoading = false,
  onRefresh,
  onLike,
  onComment,
  onShare,
  onReport,
  onHide,
  onDelete,
  onSave,
  isPostSaved,
  onMuteUser,
  enableSwipeGestures = true,
  enableVirtualization = false,
  estimatedItemHeight = 400,
  className,
}: FeedListProps) {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('FeedList');
  }

  // View tracking hook for capturing post views
  const { trackView } = useViewTracking();
  const { t } = useTranslation();

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  
  // State
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  /**
   * Calculate visible items for virtualization
   */
  const { visiblePosts, topSpacer, bottomSpacer } = useMemo(() => {
    if (!enableVirtualization || posts.length <= 10) {
      return {
        visiblePosts: posts,
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }

    const BUFFER_SIZE = 3;
    const GAP_SIZE = 16; // space-y-4 = 16px gap
    
    const { start, end } = calculateVisibleRange(
      scrollTop,
      containerHeight,
      posts.length,
      estimatedItemHeight,
      BUFFER_SIZE
    );
    
    const { topHeight, bottomHeight } = getSpacerHeights(
      start,
      end,
      posts.length,
      estimatedItemHeight + GAP_SIZE
    );
    
    return {
      visiblePosts: posts.slice(start, end),
      topSpacer: topHeight,
      bottomSpacer: bottomHeight,
    };
  }, [posts, scrollTop, containerHeight, enableVirtualization, estimatedItemHeight]);

  /**
   * Handle scroll for virtualization
   */
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (enableVirtualization) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [enableVirtualization]);

  /**
   * Track container size for virtualization
   */
  useEffect(() => {
    if (!enableVirtualization) return;

    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || window.innerHeight);
      } else {
        setContainerHeight(window.innerHeight);
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    
    return () => {
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, [enableVirtualization]);

  /**
   * Setup Intersection Observer for infinite scroll
   */
  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  /**
   * Handle touch start for pull-to-refresh
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onRefresh || isRefreshing) return;
    
    // Only allow pull-to-refresh when at top of scroll
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [onRefresh, isRefreshing]);

  /**
   * Handle touch move for pull-to-refresh
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    touchCurrentY.current = e.touches[0].clientY;
    const distance = Math.max(0, touchCurrentY.current - touchStartY.current);
    
    // Apply resistance for smooth feel
    const resistedDistance = Math.min(distance * 0.5, PULL_THRESHOLD * 1.5);
    setPullDistance(resistedDistance);
  }, [isPulling, isRefreshing]);

  /**
   * Handle touch end for pull-to-refresh
   */
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, onRefresh, isRefreshing]);

  // Show initial loading skeletons
  if (isInitialLoading) {
    return (
      <div className={cn('space-y-3 sm:space-y-4 px-0 sm:px-0', className)}>
        {[1, 2, 3].map((i) => (
          <FeedItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state when no posts - responsive with larger icon on mobile
  if (posts.length === 0 && !isLoading) {
    return (
      <div className="px-3 sm:px-0">
        <EmptyState
          icon={
            <IconMoodEmpty 
              size={56} 
              className="text-gray-300 dark:text-gray-600 sm:w-12 sm:h-12" 
            />
          }
          message={t('feed.empty.noPosts')}
          description={t('feed.empty.adjustPreferences')}
          action={
            onRefresh && (
              <Button 
                variant="outline" 
                onClick={onRefresh}
                className={cn(
                  'min-h-[44px] w-full sm:w-auto',
                  'font-medium active:scale-[0.98] transition-transform'
                )}
              >
                <IconRefresh size={18} className="mr-2" />
                {t('feed.empty.refreshFeed')}
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        enableVirtualization && 'overflow-y-auto',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      {/* Pull to refresh indicator */}
      {onRefresh && (
        <div
          className={cn(
            'absolute left-0 right-0 flex items-center justify-center transition-all duration-200',
            'pointer-events-none',
            pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            top: -60 + (isRefreshing ? PULL_THRESHOLD : pullDistance),
            height: 60,
          }}
        >
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              'bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700',
              isRefreshing && 'animate-spin'
            )}
          >
            <IconRefresh
              size={20}
              className={cn(
                'text-primary-500 transition-transform',
                pullDistance >= PULL_THRESHOLD && !isRefreshing && 'rotate-180'
              )}
            />
          </div>
        </div>
      )}

      {/* Transform container for pull effect */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? PULL_THRESHOLD : pullDistance}px)`,
        }}
      >
        {/* Top spacer for virtualization */}
        {enableVirtualization && topSpacer > 0 && (
          <div style={{ height: topSpacer }} aria-hidden="true" />
        )}

        {/* Feed items - responsive gap */}
        <div className="space-y-3 sm:space-y-4">
          {visiblePosts.map((post) => {
            const postId = post._id || post.id;
            
            // Wrap in SwipeableCard for mobile swipe gestures
            const feedCard = (
              <FeedItemCard
                item={post}
                currentUserId={currentUserId}
                onLike={onLike}
                onComment={onComment}
                onShare={onShare}
                onReport={onReport}
                onHide={onHide}
                onDelete={onDelete}
                onSave={onSave}
                isPostSaved={isPostSaved}
                onMuteUser={onMuteUser}
              />
            );
            
            // Wrap the post content with view tracking
            const postContent = enableSwipeGestures ? (
              <SwipeableCard
                onSave={onSave ? () => onSave(postId) : undefined}
                onShare={onShare ? () => onShare(postId) : undefined}
                onHide={onHide ? () => onHide(postId) : undefined}
                onReport={onReport ? () => onReport(postId) : undefined}
                isSaved={isPostSaved?.(postId)}
              >
                {feedCard}
              </SwipeableCard>
            ) : (
              feedCard
            );
            
            return (
              <FeedItemErrorBoundary key={postId} postId={postId} errorMessage={t('feed.empty.failedToLoad')}>
                <ViewTrackingWrapper postId={postId} onVisible={trackView}>
                  {postContent}
                </ViewTrackingWrapper>
              </FeedItemErrorBoundary>
            );
          })}
        </div>

        {/* Bottom spacer for virtualization */}
        {enableVirtualization && bottomSpacer > 0 && (
          <div style={{ height: bottomSpacer }} aria-hidden="true" />
        )}

        {/* Loading more indicator */}
        {isLoading && posts.length > 0 && (
          <div className="flex justify-center py-6 sm:py-8">
            <IconLoader2 size={28} className="animate-spin text-primary-500" />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && posts.length > 0 && !isLoading && (
          <div className="flex flex-col items-center py-6 sm:py-8 text-center px-4">
            <div className="w-16 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('feed.empty.reachedEnd')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('feed.empty.followMore')}
            </p>
          </div>
        )}

        {/* Sentinel for infinite scroll detection */}
        {hasMore && onLoadMore && (
          <div
            ref={sentinelRef}
            className="h-4 w-full"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

export default FeedList;
