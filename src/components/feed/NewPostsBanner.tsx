'use client';

import React from 'react';
import { IconRefresh, IconArrowUp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Props for NewPostsBanner component
 */
interface NewPostsBannerProps {
  /** Number of new posts available */
  count: number;
  /** Callback when banner is clicked to refresh feed */
  onRefresh: () => void;
  /** Whether a refresh is in progress */
  isRefreshing?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * NewPostsBanner Component
 * Floating banner that appears when new posts are available
 * Clicking refreshes the feed and scrolls to top
 * 
 * Mobile: Full width with safe-area handling
 * Desktop: Floating centered pill
 */
export function NewPostsBanner({
  count,
  onRefresh,
  isRefreshing = false,
  className,
}: NewPostsBannerProps) {
  // Don't render if no new posts
  if (count <= 0) {
    return null;
  }

  const handleClick = () => {
    if (!isRefreshing) {
      onRefresh();
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50',
        'animate-slide-down',
        // Mobile: Full width with safe-area-aware padding
        'left-0 right-0 px-3 sm:px-0',
        'top-[calc(env(safe-area-inset-top)+4rem)] sm:top-20 md:top-24',
        // Desktop: Centered floating
        'sm:left-1/2 sm:right-auto sm:-translate-x-1/2',
        className
      )}
    >
      <Button
        onClick={handleClick}
        disabled={isRefreshing}
        className={cn(
          'flex items-center justify-center gap-2',
          // Mobile: Full width, 44px touch target
          'w-full sm:w-auto',
          'min-h-[44px] sm:min-h-0',
          'px-3 py-2 sm:px-4 sm:py-2.5',
          'rounded-full shadow-lg',
          'bg-primary-600 hover:bg-primary-700 text-white',
          'transition-all duration-300',
          'active:scale-[0.98] sm:hover:scale-105 sm:active:scale-95',
          isRefreshing && 'opacity-75'
        )}
      >
        {isRefreshing ? (
          <IconRefresh size={18} className="animate-spin" />
        ) : (
          <IconArrowUp size={18} />
        )}
        <span className="font-medium text-sm">
          {count === 1
            ? '1 new post'
            : count > 99
            ? '99+ new posts'
            : `${count} new posts`}
        </span>
      </Button>
    </div>
  );
}

export default NewPostsBanner;
