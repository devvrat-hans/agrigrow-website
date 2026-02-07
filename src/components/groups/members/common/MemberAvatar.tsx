'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveImage } from '@/components/common';

/**
 * Avatar size variants
 */
type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * MemberAvatar component props
 */
interface MemberAvatarProps {
  /** Member's profile image URL */
  imageUrl?: string;
  /** Member's display name (used for fallback initials) */
  name: string;
  /** Avatar size variant */
  size?: AvatarSize;
  /** Whether the member is currently online */
  isOnline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Size class mappings
 */
const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10 sm:w-12 sm:h-12',
  lg: 'w-12 h-12 sm:w-14 sm:h-14',
};

/**
 * Fallback text size classes
 */
const textSizeClasses: Record<AvatarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm sm:text-base',
  lg: 'text-base sm:text-lg',
};

/**
 * Online indicator size classes
 */
const onlineIndicatorClasses: Record<AvatarSize, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
  lg: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
};

/**
 * Online indicator position classes
 */
const onlinePositionClasses: Record<AvatarSize, string> = {
  sm: 'right-0 bottom-0',
  md: 'right-0 bottom-0',
  lg: 'right-0.5 bottom-0.5',
};

/**
 * MemberAvatar component
 * 
 * A responsive avatar component for group members with optional
 * online status indicator and fallback to initials.
 * 
 * @example
 * ```tsx
 * <MemberAvatar 
 *   imageUrl="/images/user.jpg" 
 *   name="John Doe" 
 *   size="md" 
 *   isOnline 
 * />
 * ```
 */
export function MemberAvatar({
  imageUrl,
  name,
  size = 'md',
  isOnline,
  className,
}: MemberAvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {/* Avatar container */}
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center',
          'bg-primary-100 dark:bg-primary-900/50',
          'ring-2 ring-white dark:ring-gray-900',
          sizeClasses[size]
        )}
      >
        {imageUrl ? (
          <ResponsiveImage
            src={imageUrl}
            alt={name}
            isAvatar
            loading="lazy"
            fallbackComponent={
              <span
                className={cn(
                  'font-medium text-primary-700 dark:text-primary-300',
                  textSizeClasses[size]
                )}
              >
                {initials}
              </span>
            }
          />
        ) : (
          <span
            className={cn(
              'font-medium text-primary-700 dark:text-primary-300',
              textSizeClasses[size]
            )}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Online indicator */}
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-white dark:border-gray-900',
            isOnline
              ? 'bg-green-500'
              : 'bg-gray-400 dark:bg-gray-600',
            onlineIndicatorClasses[size],
            onlinePositionClasses[size]
          )}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

export default MemberAvatar;
