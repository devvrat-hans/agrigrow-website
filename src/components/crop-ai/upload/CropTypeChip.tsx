'use client';

import { cn } from '@/lib/utils';

interface CropTypeChipProps {
  /** Chip label text */
  label: string;
  /** Whether the chip is selected */
  selected: boolean;
  /** Click handler */
  onClick: () => void;
  /** Whether the chip is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * CropTypeChip Component
 *
 * Single selectable crop type chip with touch-friendly sizing.
 * Supports selected/unselected states with appropriate styling.
 *
 * @example
 * <CropTypeChip
 *   label="Rice"
 *   selected={selectedCrop === 'rice'}
 *   onClick={() => setSelectedCrop('rice')}
 * />
 */
export function CropTypeChip({
  label,
  selected,
  onClick,
  disabled = false,
  className,
}: CropTypeChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center',
        'min-h-[40px] sm:min-h-[36px] px-3 sm:px-4',
        'rounded-full border text-sm font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
        // Selected state
        selected && [
          'bg-primary-100 dark:bg-primary-900/50',
          'border-primary-500 dark:border-primary-400',
          'text-primary-700 dark:text-primary-300',
        ],
        // Unselected state
        !selected && [
          'bg-gray-50 dark:bg-gray-800',
          'border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-300',
          'hover:border-gray-300 dark:hover:border-gray-600',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
        ],
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {label}
    </button>
  );
}
