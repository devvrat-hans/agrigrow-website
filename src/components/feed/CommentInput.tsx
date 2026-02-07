'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconSend, IconX, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * User info for avatar display
 */
interface UserInfo {
  _id?: string;
  fullName?: string;
  profileImage?: string;
}

/**
 * Props for CommentInput component
 */
interface CommentInputProps {
  user?: UserInfo;
  placeholder?: string;
  isReply?: boolean;
  autoFocus?: boolean;
  onSubmit: (content: string) => Promise<unknown>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Get user initials for avatar fallback
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * CommentInput Component
 * Reusable input for adding comments or replies
 */
export function CommentInput({
  user,
  placeholder = 'Write a comment...',
  isReply = false,
  autoFocus = false,
  onSubmit,
  onCancel,
  disabled = false,
  className,
}: CommentInputProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [content, isSubmitting, disabled, onSubmit]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Cancel on Escape
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setContent('');
    onCancel?.();
  };

  const isValid = content.trim().length > 0;
  const showActions = isFocused || content.length > 0 || isReply;

  return (
    <div className={cn('flex gap-2', isReply ? 'mt-2' : '', className)}>
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.fullName || 'User'}
            className={cn(
              'rounded-full bg-gray-200 dark:bg-gray-700',
              isReply ? 'w-7 h-7' : 'w-9 h-9'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full',
              'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400',
              'text-xs font-medium',
              isReply ? 'w-7 h-7' : 'w-9 h-9'
            )}
          >
            {getInitials(user?.fullName)}
          </div>
        )}
      </div>

      {/* Input Container */}
      <div className="flex-1">
        <div
          className={cn(
            'relative rounded-xl border transition-all duration-200 overflow-hidden',
            'bg-gray-50 dark:bg-gray-900',
            'ring-0 focus-within:ring-0',
            isFocused
              ? 'border-gray-400 dark:border-gray-500'
              : 'border-gray-200 dark:border-gray-700',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            maxLength={1000}
            rows={1}
            className={cn(
              'w-full px-3 py-2 resize-none',
              // Minimum 44px height for touch-friendly input
              'min-h-[44px]',
              // 16px font-size to prevent iOS zoom on focus
              'text-base sm:text-sm',
              'bg-transparent',
              // Remove all focus outlines
              '[&:focus]:outline-none [&:focus-visible]:outline-none',
              'focus:outline-none focus-visible:outline-none outline-none',
              'focus:ring-0 focus-visible:ring-0',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              disabled && 'cursor-not-allowed'
            )}
            style={{ outline: 'none' }}
            aria-label={isReply ? t('feed.comments.writeReply') : t('feed.comments.writeComment')}
          />

          {/* Action buttons - show when focused or has content */}
          {showActions && (
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-xs text-gray-400">
                {content.length}/1000
              </span>
              <div className="flex items-center gap-2">
                {/* Cancel button for replies - 44px minimum touch target */}
                {isReply && onCancel && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="min-h-[44px] h-auto px-3"
                  >
                    <IconX size={14} className="mr-1" />
                    {t('feed.comments.cancel')}
                  </Button>
                )}

                {/* Submit button - 44px minimum touch target */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isValid || isSubmitting || disabled}
                  className="min-h-[44px] h-auto px-4"
                >
                  {isSubmitting ? (
                    <IconLoader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <IconSend size={14} className="mr-1" />
                      {isReply ? t('feed.comments.reply') : t('feed.comments.post')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        {showActions && !isReply && (
          <p className="text-[10px] text-gray-400 mt-1">
            {t('feed.comments.pressCtrlEnter')}
          </p>
        )}
      </div>
    </div>
  );
}

export default CommentInput;
