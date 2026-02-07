'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for PostSkeleton component
 */
interface PostSkeletonProps {
  /** Whether to show image placeholder */
  showImage?: boolean;
  /** Number of text lines to show */
  textLines?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Animated skeleton line component - responsive
 */
function SkeletonLine({
  width = '100%',
  mobileWidth,
  height = 'h-4',
  className,
}: {
  width?: string;
  mobileWidth?: string;
  height?: string;
  className?: string;
}) {
  return (
    <>
      {/* Mobile version */}
      {mobileWidth && (
        <div
          className={cn(
            'bg-gray-200 dark:bg-gray-700 rounded animate-pulse sm:hidden',
            height,
            className
          )}
          style={{ width: mobileWidth }}
        />
      )}
      {/* Desktop version or default */}
      <div
        className={cn(
          'bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
          mobileWidth ? 'hidden sm:block' : '',
          height,
          className
        )}
        style={{ width }}
      />
    </>
  );
}

/**
 * PostSkeleton Component
 * 
 * Skeleton placeholder that matches the FeedItemCard layout.
 * Used during loading states to prevent layout shift.
 * 
 * Features:
 * - Matches FeedItemCard structure exactly
 * - Animated pulse effect
 * - Optional image placeholder
 * - Configurable text lines
 * - Responsive dimensions for mobile
 */
export function PostSkeleton({
  showImage = true,
  textLines = 3,
  className,
}: PostSkeletonProps) {
  return (
    <article
      className={cn(
        'bg-white dark:bg-gray-950 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800',
        'overflow-hidden',
        className
      )}
      aria-label="Loading post"
      role="status"
    >
      {/* Header Section - responsive padding and avatar */}
      <div className="flex items-start justify-between p-3 sm:p-4 pb-0">
        <div className="flex gap-2.5 sm:gap-3">
          {/* Avatar Skeleton - responsive size */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />

          {/* Author Info Skeleton - responsive widths */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonLine width="120px" mobileWidth="90px" height="h-4" />
              <SkeletonLine width="50px" mobileWidth="40px" height="h-3" />
            </div>
            <SkeletonLine width="80px" mobileWidth="60px" height="h-3" />
          </div>
        </div>

        {/* More Options Skeleton - responsive */}
        <div className="w-9 h-9 sm:w-8 sm:h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Post Type Badge Skeleton */}
      <div className="px-3 sm:px-4 pt-3">
        <SkeletonLine width="70px" mobileWidth="60px" height="h-5" className="rounded-full" />
      </div>

      {/* Content Section - responsive padding and widths */}
      <div className="p-3 sm:p-4 space-y-2">
        {Array.from({ length: textLines }).map((_, index) => (
          <SkeletonLine
            key={index}
            width={index === textLines - 1 ? '60%' : '100%'}
            mobileWidth={index === textLines - 1 ? '70%' : '100%'}
            height="h-4"
          />
        ))}
      </div>

      {/* Image Skeleton - responsive aspect ratio */}
      {showImage && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="w-full aspect-[4/3] sm:aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Crop Tags Skeleton - responsive */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3 flex flex-wrap gap-1.5 sm:gap-2">
        <SkeletonLine width="60px" mobileWidth="50px" height="h-5 sm:h-6" className="rounded-full" />
        <SkeletonLine width="80px" mobileWidth="65px" height="h-5 sm:h-6" className="rounded-full" />
        <SkeletonLine width="50px" mobileWidth="45px" height="h-5 sm:h-6" className="rounded-full" />
      </div>

      {/* Interaction Bar Skeleton - responsive with touch-friendly heights */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1 sm:gap-1">
          {/* Like Button Skeleton */}
          <div className="h-10 w-14 sm:h-9 sm:w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          {/* Comment Button Skeleton */}
          <div className="h-10 w-14 sm:h-9 sm:w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          {/* Share Button Skeleton */}
          <div className="h-10 w-10 sm:h-9 sm:w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        {/* Bookmark Button Skeleton */}
        <div className="h-10 w-10 sm:h-9 sm:w-9 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading post content...</span>
    </article>
  );
}

/**
 * Multiple post skeletons for feed loading
 */
interface PostSkeletonListProps {
  /** Number of skeleton posts to show */
  count?: number;
  /** Additional class names */
  className?: string;
}

export function PostSkeletonList({ count = 3, className }: PostSkeletonListProps) {
  return (
    <div className={cn('space-y-3 sm:space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton
          key={index}
          // Vary the appearance slightly for visual interest
          showImage={index % 2 === 0}
          textLines={index % 3 === 0 ? 4 : 3}
        />
      ))}
    </div>
  );
}

export default PostSkeleton;
