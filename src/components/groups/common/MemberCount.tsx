'use client';

import React from 'react';
import { IconUsers } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * MemberCount component sizes
 */
type MemberCountSize = 'sm' | 'md' | 'lg';

/**
 * MemberCount component props
 */
interface MemberCountProps {
  /** Number of members */
  count: number;
  /** Size variant */
  size?: MemberCountSize;
  /** Whether to show the users icon */
  icon?: boolean;
  /** Custom label (defaults to "members") */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configuration for MemberCount with responsive variants
 */
const sizeConfig: Record<MemberCountSize, { text: string; icon: string; gap: string }> = {
  sm: { text: 'text-xs', icon: 'w-3 h-3 sm:w-3.5 sm:h-3.5', gap: 'gap-1' },
  md: { text: 'text-xs sm:text-sm', icon: 'w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4', gap: 'gap-1 sm:gap-1.5' },
  lg: { text: 'text-xs sm:text-sm md:text-base', icon: 'w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5', gap: 'gap-1.5 sm:gap-2' },
};

/**
 * Format large numbers to K/M notation
 * 
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.2K", "2.5M")
 */
function formatCount(num: number): string {
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1);
    // Remove trailing .0
    return formatted.endsWith('.0') 
      ? `${Math.floor(num / 1000000)}M` 
      : `${formatted}M`;
  }
  
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1);
    // Remove trailing .0
    return formatted.endsWith('.0') 
      ? `${Math.floor(num / 1000)}K` 
      : `${formatted}K`;
  }
  
  return num.toString();
}

/**
 * MemberCount component
 * 
 * Displays a formatted member count with optional icon.
 * Automatically formats large numbers (e.g., 1.2K, 2.5M).
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function MemberCount({
  count,
  size = 'md',
  icon = false,
  label = 'members',
  className,
}: MemberCountProps) {
  const config = sizeConfig[size];
  const formattedCount = formatCount(count);
  
  // Determine label text based on count
  const labelText = count === 1 ? 'member' : label;
  
  return (
    <div
      className={cn(
        'inline-flex items-center',
        config.gap,
        config.text,
        'text-gray-600 dark:text-gray-400',
        className
      )}
      aria-label={`${count} ${labelText}`}
    >
      {icon && (
        <IconUsers 
          className={cn(config.icon, 'text-gray-500 dark:text-gray-500')} 
          aria-hidden="true" 
        />
      )}
      <span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {formattedCount}
        </span>
        {' '}
        <span className="text-gray-500 dark:text-gray-500">
          {labelText}
        </span>
      </span>
    </div>
  );
}

export default MemberCount;
