'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import {
  IconPhoto,
  IconChevronDown,
  IconUser,
  IconSparkles,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * User role types for placeholder text
 */
export type UserRole = 'farmer' | 'student' | 'expert' | 'business';

/**
 * Props for CreatePostCard component
 */
interface CreatePostCardProps {
  /** Current user's avatar URL */
  avatarUrl?: string;
  /** Current user's name */
  userName?: string;
  /** Current user's role */
  userRole?: UserRole;
  /** Handler when card is clicked to open CreatePostModal */
  onClick?: () => void;
  /** Whether to make the card sticky on desktop */
  stickyOnDesktop?: boolean;
  /** Whether a new post was recently created - shows highlight animation */
  showNewPostHighlight?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get placeholder text based on user role
 */
function getPlaceholderText(role?: UserRole): string {
  switch (role) {
    case 'farmer':
      return "What's on your mind?";
    case 'student':
      return "Share your learning...";
    case 'expert':
      return "Share advice...";
    case 'business':
      return "Share an update...";
    default:
      return "What's on your mind?";
  }
}

/**
 * Get secondary placeholder based on role
 */
function getSecondaryText(role?: UserRole): string {
  switch (role) {
    case 'farmer':
      return "Ask questions, share updates, or celebrate your success";
    case 'student':
      return "Share notes, ask questions, or discuss farming topics";
    case 'expert':
      return "Help farmers with their challenges";
    case 'business':
      return "Promote products or share industry news";
    default:
      return "Share with the farming community";
  }
}

/**
 * CreatePostCard Component
 * Feed entry point for creating posts - displays at top of feed
 * Clicking opens the CreatePostModal
 */
export function CreatePostCard({
  avatarUrl,
  userName,
  userRole = 'farmer',
  onClick,
  stickyOnDesktop = true,
  showNewPostHighlight = false,
  className,
}: CreatePostCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      aria-label="Create a new post"
      className={cn(
        // Responsive padding and border radius
        'p-3 sm:p-4 cursor-pointer',
        'border border-gray-200 dark:border-gray-800',
        'transition-all duration-200 ease-out',
        // Sticky on desktop, scrollable on mobile
        stickyOnDesktop && 'md:sticky md:top-0 md:z-30',
        // New post highlight animation
        showNewPostHighlight && 'animate-pulse-once',
        // Hover effects
        isHovered && !isPressed && 'shadow-md border-primary-200 dark:border-primary-800',
        isHovered && !isPressed && 'transform scale-[1.005]',
        // Press effect
        isPressed && 'transform scale-[0.995] shadow-sm',
        // Focus styles
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        className
      )}
    >
        <div className="flex items-center gap-3">
          {/* User Avatar - responsive sizing for mobile */}
          <div
            className={cn(
              // Responsive avatar size: 36px mobile, 40px sm+
              'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 overflow-hidden',
              'bg-primary-100 dark:bg-primary-900 flex items-center justify-center',
              'ring-2 ring-white dark:ring-gray-900 shadow-sm',
              'transition-transform duration-200',
              isHovered && 'transform scale-105'
            )}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={userName || 'User'} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <IconUser className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
            )}
          </div>

          {/* Placeholder Input Area */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div
              className={cn(
                // Minimum touch target height of 44px
                'w-full px-3 sm:px-4 py-2.5 min-h-[44px] rounded-full flex items-center',
                'bg-gray-100 dark:bg-gray-800',
                // Responsive text size
                'text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400',
                'overflow-hidden',
                'transition-all duration-200',
                isHovered && 'bg-gray-50 dark:bg-gray-700'
              )}
            >
              <span className="truncate block w-full">
                {getPlaceholderText(userRole)}
              </span>
            </div>
            <p className="hidden sm:block mt-1 px-4 text-xs sm:text-sm text-gray-400 dark:text-gray-500">
              {getSecondaryText(userRole)}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Photo Button - with 44px minimum touch target */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className={cn(
                // Ensure minimum 44px touch target
                'min-w-[44px] min-h-[44px] p-2.5 rounded-full',
                'flex items-center justify-center',
                'bg-green-50 dark:bg-green-900/30',
                'text-green-600 dark:text-green-400',
                'hover:bg-green-100 dark:hover:bg-green-900/50',
                'transition-colors duration-200'
              )}
              aria-label="Add photo to post"
            >
              <IconPhoto size={20} />
            </button>

            {/* Post Type Selector Button - with minimum touch target */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className={cn(
                // Ensure minimum 44px touch target height
                'flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full',
                'bg-primary-50 dark:bg-primary-900/30',
                'text-primary-600 dark:text-primary-400',
                'hover:bg-primary-100 dark:hover:bg-primary-900/50',
                'text-sm font-medium',
                'transition-colors duration-200'
              )}
              aria-label="Select post type"
            >
              <IconSparkles size={18} />
              <span className="hidden md:inline">Post</span>
              <IconChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Quick Actions Row */}
        <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className={cn(
              // Minimum 44px touch target height
              'flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-sm',
              'transition-colors duration-200'
            )}
            aria-label="Add photo to post"
          >
            <IconPhoto size={18} className="text-green-500" />
            <span>Photo</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className={cn(
              // Minimum 44px touch target height
              'flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-sm',
              'transition-colors duration-200'
            )}
            aria-label="Select post type"
          >
            <IconSparkles size={18} className="text-primary-500" />
            <span>Type</span>
          </button>
        </div>
      </Card>
  );
}

export default CreatePostCard;
