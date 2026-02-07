'use client';

/**
 * FollowButton Component
 * 
 * A button to follow/unfollow users with different visual states:
 * - Follow (primary): User is not following
 * - Following (outlined): User is following, shows Unfollow on hover
 * - Pending (gray): Follow request sent, awaiting approval
 * - Loading: Action in progress
 */

import { useState, useCallback, useEffect } from 'react';
import { IconCheck, IconLoader2, IconUserPlus, IconUserMinus, IconClock } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useFollow } from '@/hooks/useFollow';
import { useFollowStatus, clearFollowStatusCache } from '@/hooks/useFollowStatus';
import type { FollowButtonSize, FollowButtonVariant } from '@/types/follow';

/**
 * FollowButton Props
 */
export interface FollowButtonProps {
  /** Phone number of the user to follow/unfollow */
  userPhone: string;
  /** Size of the button */
  size?: FollowButtonSize;
  /** Visual variant */
  variant?: FollowButtonVariant;
  /** Callback when follow status changes */
  onFollowChange?: (isFollowing: boolean, isPending?: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show text labels */
  showLabel?: boolean;
  /** Custom label for Follow state */
  followLabel?: string;
  /** Custom label for Following state */
  followingLabel?: string;
  /** Custom label for Pending state */
  pendingLabel?: string;
  /** Custom label for Unfollow hover state */
  unfollowLabel?: string;
}

/**
 * Size configuration for the button
 */
const sizeConfig = {
  sm: {
    button: 'h-7 px-2.5 text-xs gap-1',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    button: 'h-8 px-3 text-sm gap-1.5',
    icon: 'h-4 w-4',
  },
  lg: {
    button: 'h-9 px-4 text-sm gap-2',
    icon: 'h-4 w-4',
  },
};

/**
 * FollowButton Component
 */
export function FollowButton({
  userPhone,
  size = 'md',
  variant = 'filled',
  onFollowChange,
  className,
  showLabel = true,
  followLabel = 'Follow',
  followingLabel = 'Following',
  pendingLabel = 'Pending',
  unfollowLabel = 'Unfollow',
}: FollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  // Hooks for follow functionality
  const {
    followUser,
    unfollowUser,
    isLoading: isActionLoading,
  } = useFollow({
    onFollowSuccess: (phone, isPending) => {
      clearFollowStatusCache(phone);
      onFollowChange?.(true, isPending);
    },
    onUnfollowSuccess: (phone) => {
      clearFollowStatusCache(phone);
      onFollowChange?.(false);
    },
  });

  const {
    isFollowing,
    isPending,
    isBlocked,
    isSelf,
    isLoading: isStatusLoading,
    setFollowStatus,
  } = useFollowStatus(userPhone);

  // Combined loading state
  const isLoading = isActionLoading(userPhone) || localLoading;
  const isInitialLoading = isStatusLoading;

  // Handle button click
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || isSelf || isBlocked) return;

    setLocalLoading(true);

    try {
      if (isFollowing || isPending) {
        // Optimistic update — save previous state for rollback
        const prevFollowing = isFollowing;
        const prevPending = isPending;
        setFollowStatus({ isFollowing: false, isPending: false });
        try {
          await unfollowUser(userPhone);
        } catch {
          // Rollback on failure
          setFollowStatus({ isFollowing: prevFollowing, isPending: prevPending });
        }
      } else {
        // Optimistic update - we don't know yet if it will be pending or active
        const result = await followUser(userPhone);
        if (result?.follow) {
          setFollowStatus({
            isFollowing: result.follow.status === 'active',
            isPending: result.follow.status === 'pending',
          });
        }
      }
    } finally {
      setLocalLoading(false);
    }
  }, [isLoading, isSelf, isBlocked, isFollowing, isPending, userPhone, followUser, unfollowUser, setFollowStatus]);

  // Reset hover state when status changes
  useEffect(() => {
    setIsHovered(false);
  }, [isFollowing, isPending]);

  // Don't render for self
  if (isSelf) return null;

  // Don't render for blocked users
  if (isBlocked) return null;

  // Get current state and display
  const getButtonState = () => {
    if (isLoading) {
      return {
        label: '',
        icon: IconLoader2,
        style: 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-wait',
        iconStyle: 'animate-spin',
      };
    }

    if (isPending) {
      return {
        label: pendingLabel,
        icon: IconClock,
        style: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
        iconStyle: '',
      };
    }

    if (isFollowing) {
      if (isHovered) {
        return {
          label: unfollowLabel,
          icon: IconUserMinus,
          style: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
          iconStyle: '',
        };
      }
      return {
        label: followingLabel,
        icon: IconCheck,
        style: variant === 'outlined'
          ? 'bg-transparent text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
          : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30',
        iconStyle: '',
      };
    }

    // Not following - show Follow button
    return {
      label: followLabel,
      icon: IconUserPlus,
      style: variant === 'filled'
        ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
        : 'bg-transparent text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
      iconStyle: '',
    };
  };

  const state = getButtonState();
  const Icon = state.icon;
  const sizeStyles = sizeConfig[size];

  // Show skeleton during initial load
  if (isInitialLoading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
          sizeStyles.button,
          'min-w-[80px]',
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'disabled:pointer-events-none',
        sizeStyles.button,
        state.style,
        className
      )}
      aria-label={state.label || 'Loading'}
    >
      <Icon className={cn(sizeStyles.icon, state.iconStyle)} />
      {showLabel && state.label && (
        <span className="whitespace-nowrap">{state.label}</span>
      )}
    </button>
  );
}

export default FollowButton;
