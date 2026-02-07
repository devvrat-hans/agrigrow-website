'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  IconX,
  IconBrandWhatsapp,
  IconLink,
  IconShare3,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useShare, type ShareType, type SharePlatform } from '@/hooks/useShare';
import { generateShareLink } from '@/lib/api-client';

/**
 * Post author interface for preview
 */
interface PostAuthor {
  _id: string;
  fullName: string;
  profileImage?: string;
}

/**
 * Post data interface for preview
 */
interface PostPreviewData {
  _id: string;
  content: string;
  images?: string[];
  author: PostAuthor;
  postType?: string;
}

/**
 * Props for ShareModal component
 */
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostPreviewData;
  onShareComplete?: (shareType: ShareType, platform?: SharePlatform) => void;
  className?: string;
}

/**
 * Share option configuration
 */
interface ShareOption {
  id: string;
  type: ShareType;
  platform?: SharePlatform;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
}

/**
 * Available share options
 */
const SHARE_OPTIONS: ShareOption[] = [
  {
    id: 'whatsapp',
    type: 'external',
    platform: 'whatsapp',
    label: 'WhatsApp',
    description: 'Share via WhatsApp',
    icon: IconBrandWhatsapp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900',
  },
  {
    id: 'copy',
    type: 'external',
    platform: 'link',
    label: 'Copy Link',
    description: 'Copy to clipboard',
    icon: IconLink,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  {
    id: 'more',
    type: 'external',
    platform: 'other',
    label: 'More Options',
    description: 'Share via other apps',
    icon: IconShare3,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900',
  },
];

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
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * ShareModal Component
 * Modal for sharing posts with various options
 */
export function ShareModal({
  isOpen,
  onClose,
  post,
  onShareComplete,
  className,
}: ShareModalProps) {
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  // Use share hook
  const {
    isSharing,
    error,
    sharePost,
    shareToWhatsApp,
    copyShareLink,
    clearError,
  } = useShare({
    onSuccess: (share) => {
      onShareComplete?.(share.shareType as ShareType, share.platform as SharePlatform);
    },
    onLinkCopied: () => {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopiedFeedback(false);
      setActiveShareId(null);
      clearError();
    }
  }, [isOpen, clearError]);

  /**
   * Check if Web Share API is available
   */
  const canUseNativeShare = typeof window !== 'undefined' && !!navigator.share;

  /**
   * Handle share option click
   */
  const handleShareClick = useCallback(
    async (option: ShareOption) => {
      if (isSharing) return;

      setActiveShareId(option.id);

      try {
        switch (option.id) {
          case 'whatsapp':
            await shareToWhatsApp(post._id, truncateText(post.content, 200));
            break;

          case 'copy':
            await copyShareLink(post._id);
            break;

          case 'more':
            // Use native share API if available
            if (canUseNativeShare) {
              try {
                await navigator.share({
                  title: `Post by ${post.author.fullName}`,
                  text: truncateText(post.content, 200),
                  url: generateShareLink(post._id),
                });
                // Track the share in background
                sharePost(post._id, 'external', 'other').catch(() => {});
              } catch (err) {
                // User cancelled — not an error
                if ((err as Error).name !== 'AbortError') {
                  console.error('Native share failed:', err);
                }
              }
            } else {
              // Fallback: copy the link to clipboard
              await copyShareLink(post._id);
            }
            break;
        }
      } finally {
        setActiveShareId(null);
      }
    },
    [isSharing, post, shareToWhatsApp, copyShareLink, sharePost, canUseNativeShare]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        variant="mobile-sheet"
        hideCloseButton
        className={cn(
          // Mobile: bottom sheet
          'w-full p-0 overflow-hidden',
          'h-auto max-h-[85dvh]',
          'border-t border-x border-b-0',
          'flex flex-col',
          // Desktop: standard modal
          'sm:max-w-md sm:border sm:h-auto',
          // Ensure no duplicate default close button
          "[&>button[aria-label='Close']]:hidden",
          'bg-white dark:bg-gray-950',
          className
        )}
      >
        {/* Handle indicator for mobile sheet */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <DialogHeader className="px-4 pt-2 pb-3 sm:py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Share Post
            </DialogTitle>
            <button
              onClick={onClose}
              disabled={isSharing}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg',
                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                'transition-colors focus:outline-none',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'active:scale-95',
                isSharing && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Close"
            >
              <IconX size={18} />
            </button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 px-4 pt-3 pb-4 space-y-4 overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <IconAlertCircle
                size={16}
                className="flex-shrink-0 mt-0.5 text-red-500"
              />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
                <button
                  onClick={clearError}
                  className="text-xs text-red-600 dark:text-red-400 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Post Preview */}
          <div className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            {/* Author Avatar */}
            {post.author.profileImage ? (
              <img
                src={post.author.profileImage}
                alt={post.author.fullName}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium flex-shrink-0">
                {getInitials(post.author.fullName)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{post.author.fullName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                {post.content}
              </p>
            </div>

            {/* Image thumbnail if any */}
            {post.images && post.images.length > 0 && (
              <div className="flex-shrink-0">
                <img
                  src={post.images[0]}
                  alt="Post thumbnail"
                  className="w-12 h-12 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
                />
              </div>
            )}
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {SHARE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeShareId === option.id;
              const isCopyOption = option.id === 'copy';

              return (
                <button
                  key={option.id}
                  onClick={() => handleShareClick(option)}
                  disabled={isSharing}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl min-h-[110px] w-full',
                    'transition-all duration-200',
                    option.bgColor,
                    'border border-transparent',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500',
                    isSharing && !isActive && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center',
                      'bg-white dark:bg-gray-950 shadow-sm',
                      option.color
                    )}
                  >
                    {isActive ? (
                      <IconLoader2 size={20} className="animate-spin" />
                    ) : isCopyOption && copiedFeedback ? (
                      <IconCheck size={20} className="text-green-500" />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium leading-tight">
                      {isCopyOption && copiedFeedback ? 'Copied!' : option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareModal;
