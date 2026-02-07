'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconSend,
  IconX,
  IconLoader2,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Mention suggestion item
 */
interface MentionSuggestion {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * GroupCommentInput component props
 */
interface GroupCommentInputProps {
  /** Current user avatar URL */
  userAvatar?: string;
  /** Current user name */
  userName?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether this is a reply input */
  isReply?: boolean;
  /** Parent comment ID (for replies) */
  parentId?: string;
  /** Callback when comment is submitted */
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  /** Callback when cancel is clicked (for replies) */
  onCancel?: () => void;
  /** Maximum character limit */
  maxLength?: number;
  /** Mention suggestions */
  mentionSuggestions?: MentionSuggestion[];
  /** Callback to fetch mention suggestions */
  onMentionSearch?: (query: string) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get first letter for avatar fallback
 */
function getInitial(name?: string): string {
  return name?.charAt(0).toUpperCase() || 'U';
}

/**
 * GroupCommentInput component
 * 
 * Comment input with auto-resizing textarea.
 * 
 * Features:
 * - User avatar display
 * - Auto-resizing textarea
 * - Submit and cancel buttons
 * - Character limit indicator
 * - Mention autocomplete (@username)
 * - Loading state during submission
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupCommentInput({
  userAvatar,
  userName,
  placeholder = 'Write a comment...',
  isReply = false,
  parentId,
  onSubmit,
  onCancel,
  maxLength = 1000,
  mentionSuggestions = [],
  onMentionSearch,
  disabled = false,
  autoFocus = false,
  className,
}: GroupCommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  const contentLength = content.length;
  const isOverLimit = contentLength > maxLength;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(value);
    setCursorPosition(cursor);

    // Check for mention trigger
    const textBeforeCursor = value.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowMentions(true);
      onMentionSearch?.(query);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  // Handle mention selection
  const handleSelectMention = (mention: MentionSuggestion) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const newText =
        textBeforeCursor.slice(0, -mentionMatch[0].length) +
        `@${mention.name} ` +
        textAfterCursor;
      setContent(newText);
    }

    setShowMentions(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), parentId);
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && isReply && onCancel) {
      onCancel();
    }
  };

  // Filter suggestions
  const filteredSuggestions = mentionSuggestions.filter((s) =>
    s.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex gap-3 p-3',
          'bg-gray-50 dark:bg-gray-800/50 rounded-lg',
          'border border-gray-200 dark:border-gray-700',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent'
        )}
      >
        {/* User avatar */}
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName || 'User'}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {getInitial(userName)}
            </span>
          </div>
        )}

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            className={cn(
              'w-full resize-none bg-transparent',
              'text-sm text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            rows={1}
            aria-label="Comment input"
          />

          {/* Character count and actions */}
          <div className="flex items-center justify-between mt-2">
            <span
              className={cn(
                'text-xs',
                isOverLimit
                  ? 'text-red-500'
                  : contentLength > maxLength * 0.9
                  ? 'text-amber-500'
                  : 'text-gray-400'
              )}
            >
              {contentLength}/{maxLength}
            </span>

            <div className="flex items-center gap-2">
              {/* Cancel button (for replies) */}
              {isReply && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="h-8"
                >
                  <IconX className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}

              {/* Submit button */}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-8"
              >
                {isSubmitting ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <IconSend className="w-4 h-4 mr-1" />
                    {isReply ? 'Reply' : 'Post'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mention suggestions */}
      {showMentions && filteredSuggestions.length > 0 && (
        <div
          ref={mentionMenuRef}
          className={cn(
            'absolute z-50 mt-1 w-64',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'max-h-48 overflow-y-auto'
          )}
        >
          <div className="py-1">
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectMention(suggestion)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2',
                  'text-left text-sm',
                  'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {suggestion.avatar ? (
                  <img
                    src={suggestion.avatar}
                    alt={suggestion.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      {getInitial(suggestion.name)}
                    </span>
                  </div>
                )}
                <span className="text-gray-900 dark:text-gray-100">
                  {suggestion.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">⌘</kbd>+
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Enter</kbd> to submit
      </p>
    </div>
  );
}

export default GroupCommentInput;
