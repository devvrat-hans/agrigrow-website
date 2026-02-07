'use client';

import React from 'react';
import { IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SelectOption {
  /** Display label */
  label: string;
  /** Unique value */
  value: string;
  /** Optional description */
  description?: string;
}

export interface SingleSelectGroupProps {
  /** Array of options to display */
  options: SelectOption[];
  
  /** Currently selected value */
  value: string;
  
  /** Callback when selection changes */
  onChange: (value: string) => void;
  
  /** Label for the group */
  label?: string;
  
  /** Whether the field is required */
  required?: boolean;
  
  /** Error message to display */
  error?: string;
  
  /** Number of columns for grid layout (default 2) */
  columns?: 1 | 2 | 3 | 4;
  
  /** Whether the group is disabled */
  disabled?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

/**
 * SingleSelectGroup Component
 * 
 * Displays options as cards/chips that can be tapped to select.
 * Selected option is highlighted in primary color.
 * Mobile-optimized with proper grid layout.
 * 
 * @example
 * <SingleSelectGroup
 *   options={[
 *     { label: 'Option 1', value: 'opt1', description: 'Description' },
 *     { label: 'Option 2', value: 'opt2' },
 *   ]}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   label="Choose an option"
 *   required
 *   columns={2}
 * />
 */
export function SingleSelectGroup({
  options,
  value,
  onChange,
  label,
  required = false,
  error,
  columns = 2,
  disabled = false,
  className,
}: SingleSelectGroupProps) {
  // Handle option click
  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
  };

  // Get grid columns class
  const getGridClass = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      default:
        return 'grid-cols-1 sm:grid-cols-2';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          className={cn(
            'block text-sm font-medium mb-3',
            error
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Options Grid */}
      <div
        className={cn('grid gap-3', getGridClass())}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              className={cn(
                // Base styles
                'relative w-full text-left',
                'px-4 py-3',
                'rounded-xl',
                'border-2',
                'transition-all duration-200',
                'min-h-[56px]',
                // Focus styles
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
                // Active/pressed state
                'active:scale-[0.98]',
                // Selected state
                isSelected && [
                  'border-primary-500 bg-primary-50 dark:bg-primary-950/50',
                  'ring-1 ring-primary-500/20',
                ],
                // Unselected state
                !isSelected && [
                  'border-gray-200 dark:border-gray-700',
                  'bg-white dark:bg-gray-900',
                  'hover:border-gray-300 dark:hover:border-gray-600',
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                ],
                // Disabled state
                disabled && [
                  'opacity-50 cursor-not-allowed',
                  'hover:border-gray-200 dark:hover:border-gray-700',
                  'hover:bg-white dark:hover:bg-gray-900',
                ],
                // Error state (when no selection and required)
                error && !isSelected && 'border-red-300 dark:border-red-700'
              )}
            >
              {/* Content Container */}
              <div className="flex items-center justify-between gap-3 w-full">
                {/* Text Content */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Label */}
                  <span
                    className={cn(
                      'block font-medium text-sm sm:text-base truncate',
                      isSelected
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {option.label}
                  </span>

                  {/* Description */}
                  {option.description && (
                    <span
                      className={cn(
                        'block text-xs sm:text-sm mt-0.5 truncate',
                        isSelected
                          ? 'text-primary-600/80 dark:text-primary-400/80'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {option.description}
                    </span>
                  )}
                </div>

                {/* Check Indicator - Always visible with fixed size */}
                <div
                  className={cn(
                    'shrink-0 grow-0',
                    'w-6 h-6',
                    'rounded-full',
                    'flex items-center justify-center',
                    'transition-all duration-200',
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                  )}
                >
                  {isSelected && (
                    <IconCheck className="w-4 h-4" stroke={3} />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default SingleSelectGroup;
