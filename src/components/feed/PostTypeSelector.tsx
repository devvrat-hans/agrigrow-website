'use client';

import React from 'react';
import {
  IconQuestionMark,
  IconMessage,
  IconBulb,
  IconAlertTriangle,
  IconTrophy,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * Post type options
 */
export type PostType = 'question' | 'update' | 'tip' | 'problem' | 'success_story';

/**
 * Post type configuration with label, icon, and colors
 */
interface PostTypeConfig {
  value: PostType;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  colors: {
    bg: string;
    bgSelected: string;
    text: string;
    textSelected: string;
    border: string;
    borderSelected: string;
  };
}

/**
 * Post type configurations
 */
const POST_TYPES: PostTypeConfig[] = [
  {
    value: 'question',
    label: 'Question',
    icon: IconQuestionMark,
    description: 'Ask for help or advice',
    colors: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      bgSelected: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      textSelected: 'text-white',
      border: 'border-blue-200 dark:border-blue-800',
      borderSelected: 'border-blue-500',
    },
  },
  {
    value: 'update',
    label: 'Update',
    icon: IconMessage,
    description: 'Share news or progress',
    colors: {
      bg: 'bg-gray-50 dark:bg-gray-900/30',
      bgSelected: 'bg-gray-600',
      text: 'text-gray-700 dark:text-gray-300',
      textSelected: 'text-white',
      border: 'border-gray-200 dark:border-gray-700',
      borderSelected: 'border-gray-600',
    },
  },
  {
    value: 'tip',
    label: 'Tip',
    icon: IconBulb,
    description: 'Share useful knowledge',
    colors: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      bgSelected: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-300',
      textSelected: 'text-white',
      border: 'border-yellow-200 dark:border-yellow-800',
      borderSelected: 'border-yellow-500',
    },
  },
  {
    value: 'problem',
    label: 'Problem',
    icon: IconAlertTriangle,
    description: 'Report an issue',
    colors: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      bgSelected: 'bg-red-500',
      text: 'text-red-700 dark:text-red-300',
      textSelected: 'text-white',
      border: 'border-red-200 dark:border-red-800',
      borderSelected: 'border-red-500',
    },
  },
  {
    value: 'success_story',
    label: 'Success',
    icon: IconTrophy,
    description: 'Share your achievements',
    colors: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      bgSelected: 'bg-green-500',
      text: 'text-green-700 dark:text-green-300',
      textSelected: 'text-white',
      border: 'border-green-200 dark:border-green-800',
      borderSelected: 'border-green-500',
    },
  },
];

/**
 * Props for PostTypeSelector component
 */
interface PostTypeSelectorProps {
  value: PostType;
  onChange: (value: PostType) => void;
  disabled?: boolean;
  variant?: 'buttons' | 'chips';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * PostTypeSelector Component
 * Displays selectable post type options as styled buttons or chips
 */
export function PostTypeSelector({
  value,
  onChange,
  disabled = false,
  variant = 'chips',
  size = 'md',
  className,
}: PostTypeSelectorProps) {
  // Size classes - responsive for mobile with 44px min touch targets
  // Using fixed icon sizes for SSR compatibility
  const sizeClasses = {
    sm: {
      container: 'gap-1.5 sm:gap-2',
      button: 'px-2.5 py-2 sm:px-2 sm:py-1 text-xs min-h-[44px] sm:min-h-0',
      icon: 14,
    },
    md: {
      container: 'gap-2 sm:gap-2',
      button: 'px-3 py-2 sm:px-3 sm:py-1.5 text-sm min-h-[44px] sm:min-h-0',
      icon: 16,
    },
    lg: {
      container: 'gap-2 sm:gap-3',
      button: 'px-4 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base min-h-[44px] sm:min-h-0',
      icon: 20,
    },
  };

  const currentSize = sizeClasses[size];

  const buttons = (
    <>
      {POST_TYPES.map((postType) => {
        const isSelected = value === postType.value;
        const Icon = postType.icon;

        return (
          <button
            key={postType.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(postType.value)}
            className={cn(
              'inline-flex items-center gap-1.5 sm:gap-1.5 rounded-full border font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shrink-0', // Prevent shrinking in horizontal scroll
              currentSize.button,
              variant === 'buttons' && 'rounded-lg',
              isSelected
                ? cn(
                    postType.colors.bgSelected,
                    postType.colors.textSelected,
                    postType.colors.borderSelected,
                    'shadow-sm' // Add shadow for better selected visibility
                  )
                : cn(
                    postType.colors.bg,
                    postType.colors.text,
                    postType.colors.border,
                    'hover:opacity-80'
                  )
            )}
            title={postType.description}
          >
            <Icon size={currentSize.icon} />
            <span className="whitespace-nowrap">{postType.label}</span>
          </button>
        );
      })}
    </>
  );

  // Use CSS-based responsive design:
  // - Mobile: Horizontal scroll container
  // - Desktop: Flex wrap
  return (
    <div
      className={cn(
        // Mobile: Horizontal scroll
        'flex overflow-x-auto pb-2 -mb-2 scrollbar-hide',
        'sm:flex-wrap sm:overflow-visible sm:pb-0 sm:mb-0',
        currentSize.container,
        className
      )}
      role="radiogroup"
      aria-label="Select post type"
      style={{
        // Ensure smooth scrolling on touch devices
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
    >
      {buttons}
    </div>
  );
}

/**
 * Get post type configuration by value
 */
export function getPostTypeConfig(type: PostType): PostTypeConfig | undefined {
  return POST_TYPES.find((pt) => pt.value === type);
}

/**
 * Export POST_TYPES for external use
 */
export { POST_TYPES };

export default PostTypeSelector;