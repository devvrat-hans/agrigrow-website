'use client';

import React, { useState, useCallback, useRef, useMemo, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconShare,
  IconDotsVertical,
  IconFlag,
  IconEyeOff,
  IconLink,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconLoader2,
  IconSeedling,
  IconX,
  IconBookmark,
  IconBookmarkFilled,
  IconChartBar,
  IconTrash,
  IconVolume3,
  IconVolume,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { trackRender } from '@/lib/performance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
import { ReportModal } from './ReportModal';
import { PostInsights } from './PostInsights';
import { useLike } from '@/hooks/useLike';
import { useShare } from '@/hooks/useShare';
import { useMuteUser } from '@/hooks/useMuteUser';
import { generateShareLink } from '@/lib/api-client';
import { ResponsiveImage, isBase64Image } from '@/components/common';

/**
 * Post author interface
 */
export interface FeedItemAuthor {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  role: string;
  avatar?: string;
  profileImage?: string;
}

/**
 * Original post data for reposts
 */
export interface OriginalPost {
  _id: string;
  content: string;
  author: FeedItemAuthor;
  createdAt: string;
}

/**
 * Post type definition
 */
export type PostType = 'question' | 'update' | 'tip' | 'problem' | 'success_story' | 'news' | 'post' | 'technique' | 'technology';

/**
 * Post data interface
 */
export interface FeedItemData {
  id: string;
  _id?: string;
  type: PostType;
  postType?: PostType;
  author: FeedItemAuthor;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount?: number;
  createdAt: string;
  tags?: string[];
  crops?: string[];
  likes?: string[];
  savedBy?: string[];
  isLiked?: boolean;
  isSaved?: boolean;
  isRepost?: boolean;
  originalPost?: OriginalPost;
  repostText?: string;
}

/**
 * Props for FeedItemCard
 */
interface FeedItemCardProps {
  item: FeedItemData;
  currentUserId?: string | null;
  onLike?: (postId: string, isLiked: boolean, likesCount: number) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<boolean>;
  onSave?: (postId: string) => Promise<{ isSaved: boolean; message: string } | null>;
  isPostSaved?: (postId: string) => boolean;
  /** Callback when a user is muted (to hide their posts from feed) */
  onMuteUser?: (authorId: string) => void;
  className?: string;
}

/**
 * Get color styling for post type badge
 */
export function getPostTypeColor(type: PostType): string {
  switch (type) {
    case 'question':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'update':
    case 'news':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'tip':
    case 'technique':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'problem':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'success_story':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'technology':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'post':
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Format post type label
 */
function formatPostTypeLabel(type: PostType): string {
  switch (type) {
    case 'success_story':
      return 'Success Story';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Format timestamp to relative time string
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return date.toLocaleDateString();
}

/**
 * Get author initials for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Content length for truncation
 */
const CONTENT_TRUNCATE_LENGTH = 300;

/**
 * ImageGallery Component (Inline)
 * Displays images in a smart grid layout with mobile optimizations
 * Handles both URL and base64 data URL images
 */
function ImageGallery({
  images,
  onImageClick,
}: {
  images: string[];
  onImageClick?: (index: number) => void;
}) {
  const count = images.length;

  if (count === 0) return null;

  const handleClick = (index: number) => {
    onImageClick?.(index);
  };

  // Optimize image loading for mobile with smaller sizes
  // For base64 images, return as-is since they can't be optimized via URL params
  const getOptimizedImageSrc = (src: string, _size: 'sm' | 'md' | 'lg' = 'md') => {
    // Base64 images can't be optimized via URL params, return as-is
    if (isBase64Image(src)) {
      return src;
    }
    // If image URL supports query params for sizing, use them
    // This is a placeholder - actual implementation depends on image service
    return src;
  };

  if (count === 1) {
    return (
      <div
        className="rounded-lg overflow-hidden cursor-pointer active:opacity-90 transition-opacity"
        onClick={() => handleClick(0)}
      >
        <ResponsiveImage
          src={getOptimizedImageSrc(images[0], 'lg')}
          alt="Post image"
          className="w-full max-h-[400px] sm:max-h-[500px]"
          objectFit="cover"
          loading="lazy"
          placeholderIconSize={48}
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {images.slice(0, 2).map((img, index) => (
          <div
            key={index}
            className="aspect-square cursor-pointer active:opacity-90 transition-opacity"
            onClick={() => handleClick(index)}
          >
            <ResponsiveImage
              src={getOptimizedImageSrc(img, 'md')}
              alt={`Post image ${index + 1}`}
              className="w-full h-full"
              objectFit="cover"
              loading="lazy"
              placeholderIconSize={32}
            />
          </div>
        ))}
      </div>
    );
  }

  // 3 or more images
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
      {images.slice(0, 3).map((img, index) => (
        <div
          key={index}
          className={cn(
            'relative cursor-pointer active:opacity-90 transition-opacity',
            index === 0 && count >= 3 && 'col-span-2 row-span-2'
          )}
          onClick={() => handleClick(index)}
        >
          <ResponsiveImage
            src={getOptimizedImageSrc(img, index === 0 ? 'lg' : 'sm')}
            alt={`Post image ${index + 1}`}
            className="w-full h-full"
            containerClassName="aspect-square"
            objectFit="cover"
            loading="lazy"
            placeholderIconSize={index === 0 ? 40 : 24}
          />
          {/* Plus count overlay on last visible image */}
          {index === 2 && count > 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                +{count - 3}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * OriginalPostCard Component
 * Shows the original post for reposts
 */
function OriginalPostCard({ post }: { post: OriginalPost }) {
  const authorName = post.author.fullName || post.author.name;
  const authorAvatar = post.author.profileImage || post.author.avatar;
  const authorId = post.author._id || post.author.id;

  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <IconRefresh size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">Reposted from</span>
      </div>
      <div className="flex gap-2">
        <Link href={`/profile/${authorId}`}>
          {authorAvatar ? (
            <ResponsiveImage
              src={authorAvatar}
              alt={authorName}
              width={32}
              height={32}
              isAvatar
              placeholderIconSize={14}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-medium">
              {getInitials(authorName)}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${authorId}`}
            className="text-sm font-medium hover:underline"
          >
            {authorName}
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {post.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FeedItemCard Component
 * Full-featured post card with all interactions
 * Wrapped in React.memo for performance optimization
 */
function FeedItemCardComponent({
  item,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onReport,
  onHide,
  onDelete,
  onSave,
  isPostSaved,
  onMuteUser,
  className,
}: FeedItemCardProps) {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('FeedItemCard');
  }
  // State
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [localIsSaved, setLocalIsSaved] = useState(item.isSaved ?? false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Setup portal container on mount & cleanup timers on unmount
  useEffect(() => {
    setPortalContainer(document.body);
    return () => {
      if (muteToastTimerRef.current) clearTimeout(muteToastTimerRef.current);
    };
  }, []);

  // Comment section ref for scrolling
  const commentSectionRef = useRef<HTMLDivElement>(null);

  // Like hook with optimistic updates
  const { toggleLike, getLikeState, isLiking } = useLike();

  // Share hook for repost functionality
  const { repost, isSharing: isReposting } = useShare();

  // Normalize item data
  const postId = item._id || item.id;
  const postType = (item.postType || item.type) as PostType;
  const authorName = item.author.fullName || item.author.name;
  const authorAvatar = item.author.profileImage || item.author.avatar;
  const authorId = item.author._id || item.author.id;
  const crops = item.crops || item.tags || [];

  // Check if current user is the post author
  const isOwnPost = currentUserId && authorId && currentUserId === authorId;

  // Mute user hook — no auto-check on mount to avoid N API calls per feed load
  // Mute status is checked lazily when the dropdown menu is opened
  const { muteUser, unmuteUser, isMuted: isAuthorMuted, isLoading: isMuteLoading, checkMuteStatus } = useMuteUser();

  // Toast state for mute confirmation
  const [muteToastMessage, setMuteToastMessage] = useState<string | null>(null);
  const muteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedMuteRef = useRef(false);

  // Get like state from hook or item
  const likeState = getLikeState(postId);
  const isLiked = likeState?.isLiked ?? item.isLiked ?? (currentUserId && item.likes?.includes(currentUserId));
  const likesCount = likeState?.likesCount ?? item.likesCount;
  const isLikingPost = isLiking(postId);

  // Content truncation
  const shouldTruncate = item.content.length > CONTENT_TRUNCATE_LENGTH;
  const displayContent = useMemo(() => {
    if (!shouldTruncate || isContentExpanded) {
      return item.content;
    }
    return item.content.slice(0, CONTENT_TRUNCATE_LENGTH).trim() + '...';
  }, [item.content, shouldTruncate, isContentExpanded]);

  /**
   * Handle like toggle with optimistic update
   */
  const handleLike = useCallback(async () => {
    if (isLikingPost) return;

    // Calculate optimistic values
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    // Optimistic update via hook
    await toggleLike(postId, !!isLiked, likesCount);

    // Call parent handler with optimistic values
    onLike?.(postId, newIsLiked, newLikesCount);
  }, [postId, isLiked, likesCount, isLikingPost, toggleLike, onLike]);

  /**
   * Handle comment button click
   */
  const handleCommentClick = useCallback(() => {
    setIsCommentsExpanded(true);
    // Scroll to comments section
    setTimeout(() => {
      commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    onComment?.(postId);
  }, [postId, onComment]);

  /**
   * Handle share button click
   */
  const handleShareClick = useCallback(() => {
    setIsShareModalOpen(true);
    onShare?.(postId);
  }, [postId, onShare]);

  /**
   * Handle repost button click
   */
  const handleRepost = useCallback(async () => {
    if (isReposting) return;
    try {
      await repost(postId);
    } catch (error) {
      console.error('Repost failed:', error);
    }
  }, [postId, repost, isReposting]);

  /**
   * Handle copy link
   */
  const handleCopyLink = useCallback(async () => {
    const shareLink = generateShareLink(postId);
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [postId]);

  /**
   * Handle save/bookmark toggle
   */
  const handleSave = useCallback(async () => {
    if (isSaving || !onSave) return;
    
    setIsSaving(true);
    
    // Optimistic update
    const previousSavedState = localIsSaved;
    setLocalIsSaved(!localIsSaved);
    
    try {
      const result = await onSave(postId);
      if (result) {
        setLocalIsSaved(result.isSaved);
      } else {
        // Revert on failure
        setLocalIsSaved(previousSavedState);
      }
    } catch {
      // Revert on error
      setLocalIsSaved(previousSavedState);
    } finally {
      setIsSaving(false);
    }
  }, [postId, onSave, isSaving, localIsSaved]);

  // Determine if post is saved (from prop function or local state)
  const isSavedPost = isPostSaved ? isPostSaved(postId) : localIsSaved;

  // Check if current user is the author (for showing insights)
  const isAuthor = currentUserId && (authorId === currentUserId);

  /**
   * Handle delete post
   */
  const handleDeletePost = useCallback(async () => {
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const success = await onDelete(postId);
      if (success) {
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [postId, onDelete, isDeleting]);

  /**
   * Handle image click for lightbox
   */
  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  /**
   * Close lightbox
   */
  const closeLightbox = () => setLightboxOpen(false);

  // Post preview data for share modal
  const sharePostData = {
    _id: postId,
    content: item.content,
    images: item.images,
    author: {
      _id: authorId,
      fullName: authorName,
      profileImage: authorAvatar,
    },
  };

  // User data for comment section
  const currentUser = currentUserId
    ? {
        _id: currentUserId,
        fullName: 'Current User',
        profileImage: undefined,
      }
    : undefined;

  return (
    <>
      <article
        className={cn(
          'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800',
          // Responsive border radius
          'rounded-lg sm:rounded-xl',
          'overflow-hidden',
          className
        )}
      >
        {/* Header Section - responsive padding */}
        <div className="flex items-center justify-between p-3 sm:p-4 pb-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Author Avatar - responsive sizing */}
            <Link href={`/profile/${authorId}`} className="flex-shrink-0 flex items-center">
              {authorAvatar ? (
                <ResponsiveImage
                  src={authorAvatar}
                  alt={authorName}
                  containerClassName="w-9 h-9 sm:w-10 sm:h-10 border-2 border-gray-200 dark:border-gray-600"
                  isAvatar
                  placeholderIconSize={18}
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm sm:text-base border-2 border-primary-200 dark:border-primary-700">
                  {getInitials(authorName)}
                </div>
              )}
            </Link>

            {/* Author Info - responsive text sizing */}
            <div className="min-w-0 flex-1 flex items-center overflow-hidden">
              <div className="flex items-center gap-1.5 h-5">
                <Link
                  href={`/profile/${authorId}`}
                  className="font-semibold text-sm sm:text-base hover:underline truncate inline-flex items-center"
                >
                  {authorName}
                </Link>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 capitalize flex-shrink-0 inline-flex items-center h-4"
                >
                  {item.author.role}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 inline-flex items-center">
                  · {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Post Type Icon and More Options */}
          <div className="flex items-center gap-1">
            {/* More Options Dropdown */}
            <DropdownMenu onOpenChange={(open) => {
              // Lazy-check mute status when dropdown is opened for the first time
              if (open && !isOwnPost && authorId && !hasCheckedMuteRef.current) {
                hasCheckedMuteRef.current = true;
                checkMuteStatus(authorId);
              }
            }}>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 flex items-center justify-center"
                aria-label="More options"
              >
                <IconDotsVertical size={18} className="text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleCopyLink}>
                {linkCopied ? (
                  <>
                    <IconCheck size={16} className="mr-2 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <IconLink size={16} className="mr-2" />
                    Copy link
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onHide && !isOwnPost && (
                <DropdownMenuItem onClick={() => onHide(postId)}>
                  <IconEyeOff size={16} className="mr-2" />
                  Hide this post
                </DropdownMenuItem>
              )}
              {!isOwnPost && (
                <DropdownMenuItem
                  disabled={isMuteLoading}
                  onClick={async () => {
                    if (isAuthorMuted) {
                      const success = await unmuteUser(authorId);
                      if (success) {
                        // Clear any existing timer
                        if (muteToastTimerRef.current) clearTimeout(muteToastTimerRef.current);
                        setMuteToastMessage(`${authorName} has been unmuted`);
                        muteToastTimerRef.current = setTimeout(() => setMuteToastMessage(null), 3000);
                      }
                    } else {
                      const success = await muteUser(authorId);
                      if (success) {
                        // Clear any existing timer
                        if (muteToastTimerRef.current) clearTimeout(muteToastTimerRef.current);
                        setMuteToastMessage(`${authorName} has been muted`);
                        muteToastTimerRef.current = setTimeout(() => setMuteToastMessage(null), 3000);
                        onMuteUser?.(authorId);
                      }
                    }
                  }}
                >
                  {isAuthorMuted ? (
                    <>
                      <IconVolume size={16} className="mr-2" />
                      Unmute this user
                    </>
                  ) : (
                    <>
                      <IconVolume3 size={16} className="mr-2" />
                      Mute this user
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {isOwnPost && onDelete && (
                <DropdownMenuItem
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-red-500 focus:text-red-500"
                >
                  <IconTrash size={16} className="mr-2" />
                  Delete post
                </DropdownMenuItem>
              )}
              {!isOwnPost && (
                <DropdownMenuItem
                  onClick={() => {
                    setIsReportModalOpen(true);
                  }}
                  className="text-red-500 focus:text-red-500"
                >
                  <IconFlag size={16} className="mr-2" />
                  Report post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Content Section - responsive padding */}
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          {/* Post Type Badge */}
          <Badge className={cn('mb-2', getPostTypeColor(postType))}>
            {formatPostTypeLabel(postType)}
          </Badge>

          {/* Repost indicator and original post */}
          {item.isRepost && item.originalPost && (
            <OriginalPostCard post={item.originalPost} />
          )}

          {/* Repost text (if any) */}
          {item.isRepost && item.repostText && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
              &quot;{item.repostText}&quot;
            </p>
          )}

          {/* Post Content - responsive font sizing */}
          <p className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {displayContent}
          </p>

          {/* Read More / Less button */}
          {shouldTruncate && (
            <button
              onClick={() => setIsContentExpanded(!isContentExpanded)}
              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline mt-1 flex items-center gap-1 min-h-[36px]"
            >
              {isContentExpanded ? (
                <>
                  Show less <IconChevronUp size={14} />
                </>
              ) : (
                <>
                  Read more <IconChevronDown size={14} />
                </>
              )}
            </button>
          )}

          {/* Image Gallery */}
          {item.images && item.images.length > 0 && (
            <div className="mt-3">
              <ImageGallery images={item.images} onImageClick={handleImageClick} />
            </div>
          )}

          {/* Crop Tags */}
          {crops.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {crops.map((crop) => (
                <Badge
                  key={crop}
                  variant="outline"
                  className="text-xs px-2 py-0.5 flex items-center gap-1"
                >
                  <IconSeedling size={10} />
                  {crop}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Interaction Bar */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Like Button - Touch-friendly min 44px height */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLikingPost}
              className={cn(
                'h-11 min-w-[44px] px-3 gap-1.5',
                'active:scale-95 transition-transform', // Haptic feedback simulation
                isLiked && 'text-red-500 hover:text-red-600'
              )}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
            >
              {isLikingPost ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : isLiked ? (
                <IconHeartFilled size={18} />
              ) : (
                <IconHeart size={18} />
              )}
              <span className="text-sm">{likesCount}</span>
            </Button>

            {/* Comment Button - Touch-friendly min 44px height */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCommentClick}
              className="h-11 min-w-[44px] px-3 gap-1.5 active:scale-95 transition-transform"
              aria-label="View comments"
            >
              <IconMessageCircle size={18} />
              <span className="text-sm">{item.commentsCount}</span>
            </Button>

            {/* Repost Button - Touch-friendly min 44px height */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              disabled={isReposting}
              className="h-11 min-w-[44px] px-3 gap-1.5 active:scale-95 transition-transform"
              aria-label="Repost"
            >
              {isReposting ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : (
                <IconRefresh size={18} />
              )}
            </Button>

            {/* Share Button - Touch-friendly min 44px height */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareClick}
              className="h-11 min-w-[44px] px-3 gap-1.5 active:scale-95 transition-transform"
              aria-label="Share post"
            >
              <IconShare size={18} />
              {item.sharesCount && item.sharesCount > 0 && (
                <span className="text-sm">{item.sharesCount}</span>
              )}
            </Button>

            {/* Insights Button - Only visible to post author */}
            {isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
                className={cn(
                  'h-11 min-w-[44px] px-3 gap-1.5 active:scale-95 transition-transform',
                  isInsightsExpanded && 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                )}
                aria-label={isInsightsExpanded ? 'Hide insights' : 'View insights'}
              >
                <IconChartBar size={18} />
              </Button>
            )}
          </div>

          {/* Bookmark Button - Touch-friendly min 44px */}
          {onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'h-11 min-w-[44px] px-3 active:scale-95 transition-transform',
                isSavedPost && 'text-primary-600 hover:text-primary-700 dark:text-primary-400'
              )}
              aria-label={isSavedPost ? 'Remove from saved' : 'Save post'}
            >
              {isSaving ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : isSavedPost ? (
                <IconBookmarkFilled size={18} />
              ) : (
                <IconBookmark size={18} />
              )}
            </Button>
          )}
        </div>

        {/* Post Insights - Only visible to post author when expanded */}
        {isAuthor && isInsightsExpanded && (
          <PostInsights
            postId={postId}
            onClose={() => setIsInsightsExpanded(false)}
          />
        )}

        {/* Comment Section */}
        <div ref={commentSectionRef}>
          <CommentSection
            postId={postId}
            postAuthorId={authorId}
            currentUser={currentUser}
            initialExpanded={isCommentsExpanded}
            commentsCount={item.commentsCount}
          />
        </div>
      </article>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={sharePostData}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        itemType="post"
        itemId={postId}
        onReportSubmitted={() => onReport?.(postId)}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simple Lightbox - rendered via portal to avoid parent overflow issues */}
      {lightboxOpen && item.images && item.images.length > 0 && portalContainer && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-10"
          >
            <IconX size={24} />
          </button>
          <img
            src={item.images[lightboxIndex]}
            alt={`Image ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Navigation */}
          {item.images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {item.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(index);
                  }}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    index === lightboxIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>,
        portalContainer
      )}

      {/* Mute toast notification */}
      {muteToastMessage && portalContainer && createPortal(
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
            <IconVolume3 size={16} />
            {muteToastMessage}
          </div>
        </div>,
        portalContainer
      )}
    </>
  );
}

/**
 * Comparison function for React.memo
 * Only re-render if critical props change
 */
function feedItemCardPropsAreEqual(
  prevProps: FeedItemCardProps,
  nextProps: FeedItemCardProps
): boolean {
  const prevItem = prevProps.item;
  const nextItem = nextProps.item;
  
  // Compare item identity
  if ((prevItem._id || prevItem.id) !== (nextItem._id || nextItem.id)) {
    return false;
  }
  
  // Compare mutable item properties
  if (
    prevItem.likesCount !== nextItem.likesCount ||
    prevItem.commentsCount !== nextItem.commentsCount ||
    prevItem.sharesCount !== nextItem.sharesCount ||
    prevItem.isLiked !== nextItem.isLiked ||
    prevItem.isSaved !== nextItem.isSaved ||
    prevItem.content !== nextItem.content
  ) {
    return false;
  }
  
  // Compare current user (affects like state)
  if (prevProps.currentUserId !== nextProps.currentUserId) {
    return false;
  }
  
  // Callbacks don't need deep comparison - they're typically stable
  return true;
}

/**
 * Memoized FeedItemCard for performance
 */
export const FeedItemCard = memo(FeedItemCardComponent, feedItemCardPropsAreEqual);

export default FeedItemCard;
