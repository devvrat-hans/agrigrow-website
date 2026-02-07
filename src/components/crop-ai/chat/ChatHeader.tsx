'use client';

import { IconX, IconMessageCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

// TYPES

export interface ChatHeaderProps {
  /** Title text to display in the header */
  title?: string;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Left action element (e.g., back button) */
  leftAction?: React.ReactNode;
  /** Right action element (e.g., history button) — rendered before close button */
  rightAction?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ChatHeader Component
 * 
 * Header section for the chat interface with title and close button.
 * Mobile-optimized with proper touch targets.
 */
export function ChatHeader({
  title = 'Ask AI',
  onClose,
  leftAction,
  rightAction,
  className,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'p-3 sm:p-4',
        'border-b border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* Left Side - Optional Action, Icon and Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {leftAction}
        <div
          className={cn(
            'flex items-center justify-center',
            'w-8 h-8 sm:w-9 sm:h-9',
            'rounded-full',
            'bg-primary-100 dark:bg-primary-900/30'
          )}
        >
          <IconMessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      {/* Right Side - Actions & Close Button */}
      <div className="flex items-center gap-1">
        {rightAction}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center',
              'min-w-[44px] min-h-[44px]',
              'rounded-full',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'active:bg-gray-200 dark:active:bg-gray-700',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
            )}
            aria-label={t('cropAi.chat.clearChat')}
          >
            <IconX className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatHeader;
