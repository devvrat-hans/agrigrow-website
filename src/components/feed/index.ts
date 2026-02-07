/**
 * Feed Components Barrel Export
 * 
 * Clean imports for all feed-related components and utilities.
 * Usage: import { FeedList, FeedItemCard, useFeed } from '@/components/feed';
 */

// ============================================================================
// Core Feed Components
// ============================================================================

// Create Post Card - Triggers post creation flow
export { CreatePostCard } from './CreatePostCard';
export type { UserRole } from './CreatePostCard';

// Create Post Modal - Full post creation form
export { CreatePostModal } from './CreatePostModal';

// Category Tabs - Feed filtering by post type
export { CategoryTabs, DEFAULT_CATEGORIES } from './CategoryTabs';
export type { CategoryItem } from './CategoryTabs';

// Feed Item Card - Individual post display
export { FeedItemCard, getPostTypeColor, formatRelativeTime } from './FeedItemCard';
export type { FeedItemData, FeedItemAuthor } from './FeedItemCard';

// Feed List - Complete feed with infinite scroll
export { FeedList } from './FeedList';

// ============================================================================
// Post Type & Input Components
// ============================================================================

// Post Type Selector - Choose post type (question, tip, etc.)
export { PostTypeSelector, POST_TYPES, getPostTypeConfig } from './PostTypeSelector';
export type { PostType } from './PostTypeSelector';

// Crop Tag Input - Add crop tags to posts
export { CropTagInput, COMMON_INDIAN_CROPS } from './CropTagInput';

// Image Uploader - Upload images for posts
export { ImageUploader } from './ImageUploader';

// ============================================================================
// Image Components
// ============================================================================

// Image Gallery - Display multiple images in post
export { ImageGallery } from './ImageGallery';

// Image Lightbox - Full-screen image viewer
export { ImageLightbox } from './ImageLightbox';

// ============================================================================
// Comment Components
// ============================================================================

// Comment Item - Individual comment display
export { CommentItem } from './CommentItem';
export type { CommentData, CommentAuthor } from './CommentItem';

// Comment Input - Comment text input field
export { CommentInput } from './CommentInput';

// Comment Section - Full comments thread
export { CommentSection } from './CommentSection';

// ============================================================================
// Share Components
// ============================================================================

// Share Modal - Share post via various platforms
export { ShareModal } from './ShareModal';

// ============================================================================
// Report Components
// ============================================================================

// Report Modal - Report post/comment for moderation
export { ReportModal } from './ReportModal';

// ============================================================================
// Real-time & Analytics Components
// ============================================================================

// New Posts Banner - Notification of new posts
export { NewPostsBanner } from './NewPostsBanner';

// Post Insights - Analytics for post authors
export { PostInsights } from './PostInsights';

// ============================================================================
// Mobile Optimization Components
// ============================================================================

// Swipeable Card - Swipe left to reveal actions on mobile
export { SwipeableCard } from './SwipeableCard';
export type { SwipeAction } from './SwipeableCard';

// Pull to Refresh - Pull down to refresh on mobile
export { PullToRefresh } from './PullToRefresh';

// ============================================================================
// Error & Loading Components
// ============================================================================

// Feed Error Boundary - Catches errors in feed components
export { FeedErrorBoundary } from './FeedErrorBoundary';

// Post Skeleton - Loading placeholder for posts
export { PostSkeleton, PostSkeletonList } from './PostSkeleton';

// Comment Skeleton - Loading placeholder for comments
export { CommentSkeleton, CommentSkeletonList, CommentSectionSkeleton } from './CommentSkeleton';

// ============================================================================
// Weather Components
// ============================================================================

// Weather Card - Displays weather on home feed
export { WeatherCard, WeatherCardSkeleton } from './WeatherCard';
export type { WeatherCardData } from './WeatherCard';