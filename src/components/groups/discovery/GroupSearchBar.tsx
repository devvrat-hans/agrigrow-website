'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

/**
 * GroupSearchBar component props
 */
interface GroupSearchBarProps {
  /** Current search value */
  value?: string;
  /** Callback when search value changes (debounced) */
  onSearch: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the search is loading */
  isLoading?: boolean;
}

/**
 * GroupSearchBar component
 * 
 * Search input with icon, debounced onChange, and clear button.
 * Mobile-optimized with proper touch targets.
 * 
 * Features:
 * - Debounced search to reduce API calls
 * - Clear button when value is present
 * - Loading state indicator
 * - Focus and hover states
 * - Accessible with proper ARIA labels
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function GroupSearchBar({
  value: controlledValue,
  onSearch,
  placeholder = 'Search communities...',
  debounceMs = 300,
  className,
  isLoading = false,
}: GroupSearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value with controlled value
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== internalValue) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Debounced search handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  // Clear search
  const handleClear = useCallback(() => {
    setInternalValue('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'relative flex items-center',
        className
      )}
    >
      {/* Search icon */}
      <div
        className={cn(
          'absolute left-3 sm:left-4 flex items-center justify-center',
          'pointer-events-none',
          'transition-colors duration-200',
          isFocused 
            ? 'text-primary-600 dark:text-primary-400' 
            : 'text-gray-400 dark:text-gray-500'
        )}
      >
        <IconSearch className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full min-h-[44px] sm:h-12 pl-10 sm:pl-11 pr-12 sm:pr-14',
          'bg-gray-100 dark:bg-gray-800',
          'border-2 border-transparent',
          'rounded-xl',
          'text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-500 dark:placeholder:text-gray-400',
          'text-sm sm:text-base',
          'transition-all duration-200',
          'focus:outline-none focus:bg-white dark:focus:bg-gray-900',
          'focus:border-primary-500 dark:focus:border-primary-400',
          'focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-primary-400/10',
          'hover:bg-gray-150 dark:hover:bg-gray-750'
        )}
        role="searchbox"
        aria-label="Search communities"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* Loading indicator or Clear button */}
      <div className="absolute right-2 sm:right-3 flex items-center">
        {isLoading ? (
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : internalValue ? (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full',
              'text-gray-400 dark:text-gray-500',
              'hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'active:scale-[0.95]',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
            )}
            aria-label="Clear search"
          >
            <IconX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default GroupSearchBar;
