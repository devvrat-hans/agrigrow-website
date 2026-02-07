'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  IconSearch, 
  IconX, 
  IconChevronDown, 
  IconCheck 
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface DropdownOption {
  /** Display label */
  label: string;
  /** Unique value */
  value: string;
  /** Optional description */
  description?: string;
}

export interface SearchableDropdownProps {
  /** Array of options to display */
  options: DropdownOption[];
  
  /** Currently selected value */
  value: string;
  
  /** Callback when selection changes */
  onChange: (value: string) => void;
  
  /** Placeholder text for empty state */
  placeholder?: string;
  
  /** Label for the input */
  label?: string;
  
  /** Whether the field is required */
  required?: boolean;
  
  /** Error message to display */
  error?: string;
  
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Placeholder for search input */
  searchPlaceholder?: string;
}

// ============================================
// Component
// ============================================

/**
 * SearchableDropdown Component
 * 
 * Combines a dropdown with search functionality.
 * Features searchable input that filters options, dropdown list below,
 * mobile-friendly with large tap targets, keyboard navigation support,
 * and clear button when value is selected.
 * 
 * @example
 * <SearchableDropdown
 *   options={[{ label: 'Option 1', value: 'opt1' }]}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   label="Select Option"
 *   placeholder="Choose an option"
 *   required
 * />
 */
export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  required = false,
  error,
  disabled = false,
  className,
  searchPlaceholder = 'Search...',
}: SearchableDropdownProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get selected option label
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
            setSearchQuery('');
            setHighlightedIndex(-1);
          }
          break;
          
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;
          
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
          break;
          
        case 'Tab':
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, onChange]
  );

  // Handle option selection
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle clear selection
  const handleClear = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onChange('');
      setSearchQuery('');
    },
    [onChange]
  );

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
      // Focus search input after opening
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [disabled, isOpen]);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Label */}
      {label && (
        <label
          className={cn(
            'block text-sm font-medium mb-1.5',
            error
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        className={cn(
          'relative w-full min-h-[48px] px-4 py-3',
          'flex items-center justify-between gap-2',
          'bg-white dark:bg-gray-900',
          'border rounded-lg',
          'text-left text-sm sm:text-base',
          'transition-all duration-200',
          // Focus states
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          // Error state
          error
            ? 'border-red-500 focus:ring-red-500/30'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500/30 focus:border-primary-500',
          // Disabled state
          disabled && 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
          // Enabled cursor
          !disabled && 'cursor-pointer',
          // Open state
          isOpen && !error && 'border-primary-500 ring-2 ring-primary-500/30'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || placeholder}
      >
        {/* Selected Value Display */}
        <span
          className={cn(
            'flex-1 truncate',
            selectedOption
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {selectedOption?.label || placeholder}
        </span>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          {/* Clear Button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'p-2 rounded-full',
                'text-gray-400 hover:text-gray-600',
                'dark:text-gray-500 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors',
                'min-w-[44px] min-h-[44px]',
                'flex items-center justify-center'
              )}
              aria-label="Clear selection"
            >
              <IconX className="w-5 h-5" />
            </button>
          )}

          {/* Dropdown Arrow */}
          <IconChevronDown
            className={cn(
              'w-5 h-5 text-gray-400 dark:text-gray-500',
              'transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full mt-1',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'overflow-hidden',
            // Animation
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <IconSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pl-9 pr-4 py-2.5',
                  'bg-gray-50 dark:bg-gray-800',
                  'border border-gray-200 dark:border-gray-700',
                  'rounded-md',
                  'text-sm',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'
                )}
              />
            </div>
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-[240px] overflow-y-auto"
            role="listbox"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'w-full px-4 py-3',
                      'flex items-center justify-between gap-3',
                      'text-left text-sm sm:text-base',
                      'transition-colors duration-100',
                      'min-h-[48px]',
                      // Highlight/hover states
                      isSelected && 'bg-primary-50 dark:bg-primary-950/50',
                      isHighlighted && !isSelected && 'bg-gray-50 dark:bg-gray-800',
                      !isSelected && !isHighlighted && 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'truncate font-medium',
                          isSelected
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {/* Check Icon */}
                    {isSelected && (
                      <IconCheck
                        className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
                      />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
