'use client';

import React from 'react';
import { IconRosetteDiscountCheck, IconStar, IconShieldCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Badge types for groups
 */
type BadgeType = 'verified' | 'official' | 'featured';

/**
 * Badge sizes
 */
type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * GroupBadge component props
 */
interface GroupBadgeProps {
  /** Type of badge to display */
  type: BadgeType;
  /** Size of the badge */
  size?: BadgeSize;
  /** Whether to show the tooltip */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge configuration for different types
 */
const badgeConfig: Record<
  BadgeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
    tooltip: string;
  }
> = {
  verified: {
    icon: IconRosetteDiscountCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    label: 'Verified',
    tooltip: 'This group has been verified by Agrigrow',
  },
  official: {
    icon: IconShieldCheck,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    label: 'Official',
    tooltip: 'Official Agrigrow community',
  },
  featured: {
    icon: IconStar,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    label: 'Featured',
    tooltip: 'Featured community of the week',
  },
};

/**
 * Size configuration for badges with responsive variants
 */
const sizeConfig: Record<BadgeSize, { icon: string; text: string; padding: string }> = {
  sm: { icon: 'w-3 h-3 sm:w-3.5 sm:h-3.5', text: 'text-xs', padding: 'px-1.5 py-0.5 sm:px-2 sm:py-1' },
  md: { icon: 'w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4', text: 'text-xs', padding: 'px-1.5 py-0.5 sm:px-2 sm:py-1' },
  lg: { icon: 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5', text: 'text-xs sm:text-sm', padding: 'px-2 py-1 sm:px-2.5 sm:py-1.5' },
};

/**
 * GroupBadge component
 * 
 * Displays verification or special status badges for groups.
 * Supports different badge types and sizes with tooltips.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupBadge({
  type,
  size = 'md',
  showTooltip = true,
  className,
}: GroupBadgeProps) {
  const config = badgeConfig[type];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  // Icon only variant (for inline use)
  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          config.color,
          className
        )}
        title={showTooltip ? config.tooltip : undefined}
        role="img"
        aria-label={config.label}
      >
        <Icon className={sizeStyles.icon} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'font-medium',
        sizeStyles.padding,
        sizeStyles.text,
        config.bgColor,
        config.color,
        className
      )}
      title={showTooltip ? config.tooltip : undefined}
      role="img"
      aria-label={config.label}
    >
      <Icon className={sizeStyles.icon} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default GroupBadge;
