'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for CommentSkeleton component
 */
interface CommentSkeletonProps {
  /** Whether this is a nested reply */
  isReply?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Animated skeleton line component
 */
function SkeletonLine({
  width = '100%',
  height = 'h-4',
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
        height,
        className
      )}
      style={{ width }}
    />
  );
}

/**
 * CommentSkeleton Component
 * 
 * Skeleton placeholder that matches the CommentItem layout.
 * Used during loading states for comments section.
 * 
 * Features:
 * - Matches CommentItem structure exactly
 * - Supports reply indentation
 * - Animated pulse effect
 * - Accessible loading state
 */
export function CommentSkeleton({ isReply = false, className }: CommentSkeletonProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        isReply && 'ml-10',
        className
      )}
      aria-label="Loading comment"
      role="status"
    >
      {/* Avatar Skeleton */}
      <div
        className={cn(
          'rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0',
          isReply ? 'w-7 h-7' : 'w-8 h-8'
        )}
      />

      {/* Comment Content Container */}
      <div className="flex-1 space-y-2">
        {/* Comment Bubble */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 space-y-2">
          {/* Author Name */}
          <SkeletonLine width="100px" height="h-3" />
          
          {/* Comment Text - multiple lines */}
          <div className="space-y-1.5">
            <SkeletonLine width="100%" height="h-3" />
            <SkeletonLine width="80%" height="h-3" />
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-4 pl-2">
          {/* Timestamp */}
          <SkeletonLine width="40px" height="h-3" />
          {/* Like Button */}
          <SkeletonLine width="35px" height="h-3" />
          {/* Reply Button */}
          <SkeletonLine width="40px" height="h-3" />
        </div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading comment...</span>
    </div>
  );
}

/**
 * Props for CommentSkeletonList component
 */
interface CommentSkeletonListProps {
  /** Number of skeleton comments to show */
  count?: number;
  /** Whether to include reply skeletons */
  showReplies?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Multiple comment skeletons for loading state
 */
export function CommentSkeletonList({
  count = 3,
  showReplies = true,
  className,
}: CommentSkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          {/* Main comment */}
          <CommentSkeleton />
          
          {/* Show a reply for every other comment */}
          {showReplies && index % 2 === 0 && (
            <CommentSkeleton isReply />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Comment section skeleton including input
 */
export function CommentSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Comment Input Skeleton */}
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
        
        {/* Input Field */}
        <div className="flex-1 flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 dark:bg-gray-700" />

      {/* Comments List Skeleton */}
      <CommentSkeletonList count={3} />

      {/* Screen reader announcement */}
      <span className="sr-only">Loading comments section...</span>
    </div>
  );
}

export default CommentSkeleton;
