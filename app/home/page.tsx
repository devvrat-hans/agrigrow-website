'use client';

import { useState, useEffect, useCallback, useRef, ErrorInfo, Component, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MobileBottomNav, PageHeader, LoadingSpinner, EmptyState } from '@/components/common';
import {
  CreatePostCard,
  CreatePostModal,
  CategoryTabs,
  FeedList,
  FeedItemData,
  NewPostsBanner,
  WeatherCard,
  FeedSearchBar,
} from '@/components/feed';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFeed, useNotifications, useNewPostsPolling, useHomeWeather } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  IconNews,
  IconBulb,
  IconTrendingUp,
  IconUser,
  IconAlertTriangle,
  IconAdjustmentsHorizontal,
  IconFilter,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import type { PostType } from '@/models/Post';

// Feed category type - matches PostType for filtering
type FeedCategory = PostType | 'all';

// Category configuration
const feedCategories = [
  { id: 'all', label: 'All', icon: IconTrendingUp },
  { id: 'news', label: 'News', icon: IconNews },
  { id: 'post', label: 'Posts', icon: IconUser },
  { id: 'question', label: 'Questions', icon: IconBulb },
  { id: 'technique', label: 'Techniques', icon: IconBulb },
  { id: 'technology', label: 'Tech', icon: IconTrendingUp },
];

/**
 * Error Boundary Props
 */
interface FeedErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

/**
 * Error Boundary State
 */
interface FeedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feed Error Boundary Component
 * Catches errors in the feed and provides retry functionality
 */
class FeedErrorBoundary extends Component<FeedErrorBoundaryProps, FeedErrorBoundaryState> {
  constructor(props: FeedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FeedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Feed Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-4 my-8 p-6 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <IconAlertTriangle size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                Something went wrong
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                {this.state.error?.message || 'An unexpected error occurred while loading the feed.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('farmer');
  const [userLocation, setUserLocation] = useState<{ state?: string; district?: string } | undefined>();
  
  // Track muted users for optimistic feed filtering
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());

  // Ref for scrolling to top
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Use the useFeed hook for feed management
  const {
    posts,
    loading,
    refreshing,
    error: feedError,
    hasMore,
    fetchMore,
    refresh,
    setCategory,
    updatePost,
    removePost,
    prependPost: _prependPost,  // Preserved for future use with real-time updates
  } = useFeed({
    initialCategory: selectedCategory === 'all' ? undefined : selectedCategory,
    limit: 15,
    sortBy: 'newest',
    autoFetch: !!userPhone, // Only fetch when we have the user phone
  });

  // Use notifications hook
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    enablePolling: true,
    pollingInterval: 30000,
    autoFetch: !!userPhone,
  });

  // New posts polling hook
  const {
    newPostsCount,
    resetNewPosts,
    updateTimestamp,
  } = useNewPostsPolling({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    enabled: !loading && !!userPhone,
    pollingInterval: 60000, // 60 seconds
  });

  // Weather hook for home feed
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
  } = useHomeWeather();

  // Get user phone from localStorage
  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      router.push('/auth/signin');
      return;
    }
    setUserPhone(phone);
    
    // Fetch user details
    fetch(`/api/user/me?phone=${phone}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserId(data.user.id);
          setUserRole(data.user.role || 'farmer');
          // Sync language preference to localStorage for voice recognition
          if (data.user.language) {
            localStorage.setItem('userLanguage', data.user.language);
          }
          if (data.user.location) {
            setUserLocation({
              state: data.user.location.state,
              district: data.user.location.district,
            });
          }
        }
      })
      .catch(console.error);
  }, [router]);

  // Fetch feed when userPhone becomes available
  useEffect(() => {
    if (userPhone && posts.length === 0 && !loading) {
      refresh();
    }
  }, [userPhone]);

  /**
   * Handle refresh from new posts banner
   * Scroll to top and refresh feed
   */
  const handleRefreshFromBanner = useCallback(async () => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Refresh posts
    await refresh();
    // Update timestamp and reset count
    updateTimestamp();
    resetNewPosts();
  }, [refresh, updateTimestamp, resetNewPosts]);

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback((categoryId: string) => {
    const newCategory = categoryId as FeedCategory;
    setSelectedCategory(newCategory);
    // Update the feed hook's category
    setCategory(newCategory === 'all' ? null : newCategory);
    // Reset new posts polling timestamp
    updateTimestamp();
    resetNewPosts();
  }, [setCategory, updateTimestamp, resetNewPosts]);

  /**
   * Handle post creation success
   * Refresh feed and scroll to top to show new post
   */
  const handlePostCreated = useCallback(() => {
    // Close modal
    setIsCreateModalOpen(false);
    
    // Refresh the feed to get the new post
    refresh();
    
    // Scroll to top to show the new post
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [refresh]);

  /**
   * Handle notification click
   */
  const handleNotificationClick = useCallback((notification: { _id: string; postId?: string }) => {
    // Mark as read
    markAsRead(notification._id);
    
    // Navigate to related post if applicable
    if (notification.postId) {
      router.push(`/posts/${notification.postId}`);
    }
  }, [markAsRead, router]);

  /**
   * Handle like action - update local feed state with new like values
   */
  const handleLike = useCallback((postId: string, isLiked: boolean, likesCount: number) => {
    // Update the post in the feed state with new like values
    updatePost(postId, {
      isLiked,
      likesCount,
    });
  }, [updatePost]);

  /**
   * Handle delete post action
   */
  const handleDeletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!userPhone) return false;
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'x-user-phone': userPhone,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the feed to remove the deleted post
        refresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }, [userPhone, refresh]);

  /**
   * Handle error boundary reset
   */
  const handleErrorReset = useCallback(() => {
    refresh();
  }, [refresh]);

  /**
   * Handle reporting a post — optimistically remove it from the feed
   */
  const handleReportPost = useCallback((postId: string) => {
    removePost(postId);
  }, [removePost]);

  /**
   * Handle muting a user — optimistically hide their posts from the feed
   */
  const handleMuteUser = useCallback((authorId: string) => {
    setMutedUserIds(prev => {
      const next = new Set(prev);
      next.add(authorId);
      return next;
    });
  }, []);

  // Convert posts to FeedItemData format, filtering out muted users' posts
  const feedItems: FeedItemData[] = posts
    .filter(post => !mutedUserIds.has(post.author._id))
    .map(post => ({
    id: post._id,
    _id: post._id,
    type: post.postType,
    postType: post.postType,
    author: {
      _id: post.author._id,
      id: post.author._id,
      fullName: post.author.fullName,
      name: post.author.fullName,
      profileImage: post.author.profileImage,
      avatar: post.author.profileImage,
      role: post.author.role || 'farmer',
    },
    content: post.content,
    images: post.images,
    tags: post.crops,
    crops: post.crops,
    commentsCount: post.commentsCount || 0,
    likesCount: post.likesCount || 0,
    sharesCount: post.sharesCount || 0,
    likes: post.likes || [],
    savedBy: post.savedBy || [],
    // Use isLiked from API (which correctly checks if user ID is in likes array)
    // Only fallback to manual check if API didn't return isLiked
    isLiked: post.isLiked ?? (userId ? (post.likes || []).includes(userId) : false),
    isSaved: post.isSaved ?? (userId ? (post.savedBy || []).includes(userId) : false),
    isRepost: post.isRepost,
    createdAt: post.createdAt,
  }));

  return (
    <div 
      className="min-h-screen bg-background pb-24 sm:pb-20 md:pb-0" 
      ref={feedContainerRef}
      style={{
        // Add safe area padding for notched devices
        paddingBottom: 'max(6rem, calc(5rem + env(safe-area-inset-bottom)))',
      }}
    >
      {/* New Posts Banner - shows when new posts are available */}
      <NewPostsBanner
        count={newPostsCount}
        onRefresh={handleRefreshFromBanner}
        isRefreshing={refreshing}
      />

      {/* Header with NotificationBell */}
      <PageHeader
        rightAction={
          <NotificationBell
            notifications={notifications.slice(0, 5)}
            unreadCount={unreadCount}
            isLoading={notificationsLoading}
            onFetchNotifications={fetchNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={markAllAsRead}
            maxDropdownItems={5}
          />
        }
      />

      {/* Main content - responsive padding with max-width constraint */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-0 pt-4">
        {/* Weather Card - shows current weather and forecast */}
        <WeatherCard
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
          onRefresh={refreshWeather}
          className="mb-3"
        />

        {/* Create Post Card - opens modal on click */}
        <CreatePostCard
          onClick={() => setIsCreateModalOpen(true)}
          stickyOnDesktop
          className="mb-3"
        />

        {/* Category Tabs with Feed Filter - responsive layout */}
        <div className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-0">
          {/* Mobile: Filter button with current category */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex sm:hidden items-center gap-2 px-3 py-2 min-h-[44px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full transition-colors active:scale-95"
            aria-label="Filter Posts"
          >
            <IconFilter size={18} />
            <span className="text-sm font-medium">
              {feedCategories.find(c => c.id === selectedCategory)?.label || 'All'}
            </span>
          </button>

          {/* Mobile: Inline search bar */}
          <div className="flex sm:hidden flex-1 min-w-0">
            <FeedSearchBar className="w-full" />
          </div>

          {/* Desktop: Full category tabs */}
          <div className="hidden sm:block flex-1 min-w-0">
            <CategoryTabs
              categories={feedCategories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* Desktop: Preferences link */}
          <button
            onClick={() => router.push('/feed-preferences')}
            className="hidden sm:flex flex-shrink-0 items-center gap-1.5 px-3 py-2 mr-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Feed Preferences"
            title="Feed Preferences"
          >
            <IconAdjustmentsHorizontal size={18} />
            <span>Preferences</span>
          </button>
        </div>

        {/* Error Boundary wrapping the feed */}
        <FeedErrorBoundary onReset={handleErrorReset}>
          {/* Initial Loading State - responsive skeletons matching FeedItemCard */}
          {loading && posts.length === 0 && (
            <div className="flex flex-col gap-3 sm:gap-4 py-4 sm:py-6">
              {/* Skeleton placeholders with responsive dimensions */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 animate-pulse"
                >
                  {/* Header - responsive avatar and gaps */}
                  <div className="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                      <div className="h-3 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                  </div>
                  {/* Content - responsive widths */}
                  <div className="space-y-2 mb-3 sm:mb-4">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-[85%] sm:w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-[60%] sm:w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
                    <div className="h-5 sm:h-6 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-5 sm:h-6 w-12 sm:w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                  {/* Image - responsive aspect ratio */}
                  <div className="aspect-[4/3] sm:aspect-video w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 sm:mb-4" />
                  {/* Actions - responsive heights for touch targets */}
                  <div className="flex items-center gap-2 sm:gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-9 sm:h-8 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1" />
                    <div className="h-9 sm:h-8 w-9 sm:w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Refresh Loading Indicator at top */}
          {refreshing && posts.length > 0 && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {/* Feed Error State */}
          {feedError && posts.length === 0 && (
            <div className="mx-4 my-8">
              <EmptyState
                message="Failed to load posts"
                description={feedError.message || 'An error occurred'}
                action={
                  <button
                    onClick={() => refresh()}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors active:scale-95"
                  >
                    Try Again
                  </button>
                }
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && !feedError && posts.length === 0 && (
            <EmptyState
              message="No posts yet"
              description="Be the first to share your farming experience!"
              action={
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create Post
                </button>
              }
            />
          )}

          {/* Feed List */}
          {posts.length > 0 && (
            <FeedList
              posts={feedItems}
              currentUserId={userId}
              onLoadMore={fetchMore}
              hasMore={hasMore}
              isLoading={loading}
              isInitialLoading={loading && posts.length === 0}
              onRefresh={refresh}
              onLike={handleLike}
              onDelete={handleDeletePost}
              onMuteUser={handleMuteUser}
              onReport={handleReportPost}
            />
          )}
        </FeedErrorBoundary>
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
        userRole={userRole}
        userLocation={userLocation}
      />

      {/* Mobile Filter Bottom Sheet */}
      <Dialog open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <DialogContent
          variant="mobile-sheet"
          hideCloseButton
          className={cn(
            'max-h-[60vh]',
            'sm:max-w-lg sm:max-h-[90vh]',
            'flex flex-col',
            'bg-white dark:bg-gray-950',
            'border border-gray-200 dark:border-gray-800',
            'p-0'
          )}
        >
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                Filter Posts
              </DialogTitle>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>
          </DialogHeader>

          {/* Filter Options */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {feedCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      handleCategoryChange(category.id as FeedCategory);
                      setIsMobileFilterOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl',
                      'min-h-[52px]',
                      'transition-all active:scale-[0.98]',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-950 border-2 border-primary-500'
                        : 'bg-gray-50 dark:bg-gray-900 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        isSelected 
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}>
                        <Icon size={20} />
                      </div>
                      <span className={cn(
                        'font-medium',
                        isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {category.label}
                      </span>
                    </div>
                    {isSelected && (
                      <IconCheck size={20} className="text-primary-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
