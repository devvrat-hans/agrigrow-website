'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Avatar size variants
 */
type AvatarSize = 'sm' | 'md';

/**
 * Size configuration for avatar dimensions with responsive variants
 */
const sizeConfig: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-xs sm:text-sm' },
};

/**
 * GroupPostAvatar component props
 */
interface GroupPostAvatarProps {
  /** Image URL for the avatar */
  imageUrl?: string;
  /** Name for fallback initials and alt text */
  name: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get initials from a name (first letter of first and last name)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent background color based on name
 */
function getBackgroundColor(name: string): string {
  const colors = [
    'bg-primary-100 dark:bg-primary-900/50',
    'bg-emerald-100 dark:bg-emerald-900/50',
    'bg-amber-100 dark:bg-amber-900/50',
    'bg-rose-100 dark:bg-rose-900/50',
    'bg-violet-100 dark:bg-violet-900/50',
    'bg-cyan-100 dark:bg-cyan-900/50',
    'bg-orange-100 dark:bg-orange-900/50',
    'bg-indigo-100 dark:bg-indigo-900/50',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get text color to match background
 */
function getTextColor(name: string): string {
  const colors = [
    'text-primary-700 dark:text-primary-300',
    'text-emerald-700 dark:text-emerald-300',
    'text-amber-700 dark:text-amber-300',
    'text-rose-700 dark:text-rose-300',
    'text-violet-700 dark:text-violet-300',
    'text-cyan-700 dark:text-cyan-300',
    'text-orange-700 dark:text-orange-300',
    'text-indigo-700 dark:text-indigo-300',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * GroupPostAvatar component
 * 
 * Displays a user avatar for group posts with image or fallback initials.
 * Responsive sizing for mobile-first design.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupPostAvatar({
  imageUrl,
  name,
  size = 'md',
  className,
}: GroupPostAvatarProps) {
  const config = sizeConfig[size];
  const initials = getInitials(name);
  const bgColor = getBackgroundColor(name);
  const textColor = getTextColor(name);

  if (imageUrl) {
    return (
      <div
        className={cn(
          config.container,
          'relative rounded-full overflow-hidden flex-shrink-0',
          className
        )}
      >
        <Image
          src={imageUrl}
          alt={`${name}'s avatar`}
          fill
          className="object-cover"
          sizes={size === 'sm' ? '32px' : '40px'}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        config.container,
        'rounded-full flex items-center justify-center flex-shrink-0',
        bgColor,
        className
      )}
      aria-label={`${name}'s avatar`}
    >
      <span className={cn(config.text, 'font-medium', textColor)}>
        {initials}
      </span>
    </div>
  );
}

export default GroupPostAvatar;
