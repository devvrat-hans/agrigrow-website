'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isBase64Image } from '@/components/common';

/**
 * Avatar sizes for GroupAvatar component
 */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Size configuration for avatar dimensions with responsive variants
 */
const sizeConfig: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs', icon: 'text-sm' },
  md: { container: 'w-10 h-10 sm:w-12 sm:h-12', text: 'text-sm sm:text-base', icon: 'text-base sm:text-lg' },
  lg: { container: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16', text: 'text-base sm:text-lg md:text-xl', icon: 'text-lg sm:text-xl md:text-2xl' },
  xl: { container: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24', text: 'text-xl sm:text-2xl md:text-3xl', icon: 'text-2xl sm:text-3xl md:text-4xl' },
};

/**
 * GroupAvatar component props
 */
interface GroupAvatarProps {
  /** Group name for fallback initial */
  name: string;
  /** Group icon emoji or icon name */
  icon?: string;
  /** Cover image URL */
  coverImage?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use rounded corners instead of circle */
  rounded?: boolean;
}

/**
 * GroupAvatar component
 * 
 * Displays a group's avatar with fallback to icon/emoji or first letter of name.
 * Supports multiple sizes and can use either an image or icon/letter.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupAvatar({
  name,
  icon,
  coverImage,
  size = 'md',
  className,
  rounded = false,
}: GroupAvatarProps) {
  const config = sizeConfig[size];
  const borderRadius = rounded ? 'rounded-lg' : 'rounded-full';
  
  // Check if icon is an emoji (simple heuristic: emoji characters are typically outside ASCII range)
  const isEmoji = icon && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(icon);
  
  // Get the first letter of the group name for fallback
  const fallbackLetter = name.charAt(0).toUpperCase();
  
  // Generate a consistent background color based on group name
  const getBackgroundColor = (str: string): string => {
    const colors = [
      'bg-primary-100 dark:bg-primary-900',
      'bg-emerald-100 dark:bg-emerald-900',
      'bg-amber-100 dark:bg-amber-900',
      'bg-rose-100 dark:bg-rose-900',
      'bg-violet-100 dark:bg-violet-900',
      'bg-cyan-100 dark:bg-cyan-900',
      'bg-orange-100 dark:bg-orange-900',
      'bg-indigo-100 dark:bg-indigo-900',
    ];
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // If we have a cover image, display it
  if (coverImage) {
    const isBase64 = isBase64Image(coverImage);
    
    return (
      <div
        className={cn(
          config.container,
          borderRadius,
          'relative overflow-hidden flex-shrink-0',
          'ring-2 ring-white dark:ring-gray-800',
          className
        )}
        role="img"
        aria-label={`${name} group avatar`}
      >
        {isBase64 ? (
          // Use native img for base64 images
          <img
            src={coverImage}
            alt={`${name} group avatar`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Use Next.js Image for URL images
          <Image
            src={coverImage}
            alt={`${name} group avatar`}
            fill
            className="object-cover"
            sizes={size === 'xl' ? '96px' : size === 'lg' ? '64px' : size === 'md' ? '48px' : '32px'}
          />
        )}
      </div>
    );
  }

  // Display icon/emoji or fallback letter
  return (
    <div
      className={cn(
        config.container,
        borderRadius,
        'flex items-center justify-center flex-shrink-0',
        'ring-2 ring-white dark:ring-gray-800',
        getBackgroundColor(name),
        className
      )}
      role="img"
      aria-label={`${name} group avatar`}
    >
      {isEmoji ? (
        <span className={cn(config.icon)} role="img" aria-hidden="true">
          {icon}
        </span>
      ) : icon ? (
        <span className={cn(config.icon, 'text-primary-700 dark:text-primary-300')} aria-hidden="true">
          {icon}
        </span>
      ) : (
        <span className={cn(config.text, 'font-semibold text-primary-700 dark:text-primary-300')}>
          {fallbackLetter}
        </span>
      )}
    </div>
  );
}

export default GroupAvatar;
