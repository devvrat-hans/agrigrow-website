'use client';

import { useMemo } from 'react';
import { IconPlant, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// TYPES

export interface AnalyzeButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Whether the analysis is in progress */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current analysis stage text */
  stage?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AnalyzeButton Component
 * 
 * Large primary button for initiating crop analysis.
 * Shows progress bar and percentage when loading.
 * 
 * @example
 * <AnalyzeButton 
 *   onClick={handleAnalyze} 
 *   loading={isAnalyzing} 
 *   progress={75} 
 * />
 */
export function AnalyzeButton({
  onClick,
  loading = false,
  disabled = false,
  progress = 0,
  stage,
  className,
}: AnalyzeButtonProps) {
  // Clamp progress to 0-100
  const normalizedProgress = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }, [progress]);

  // Determine button state
  const isDisabled = disabled || loading;

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'relative w-full min-h-[48px] sm:min-h-[44px] h-auto py-3',
        'text-base sm:text-sm font-semibold',
        'overflow-hidden',
        'active:scale-[0.98] transition-transform',
        // Gradient background when not loading
        !loading && !disabled && [
          'bg-gradient-to-r from-primary-600 to-primary-500',
          'hover:from-primary-700 hover:to-primary-600',
          'dark:from-primary-500 dark:to-primary-400',
          'dark:hover:from-primary-600 dark:hover:to-primary-500',
        ],
        // Loading state background
        loading && [
          'bg-primary-100 dark:bg-primary-900/50',
          'text-primary-700 dark:text-primary-300',
        ],
        // Disabled state
        disabled && !loading && [
          'bg-gray-200 dark:bg-gray-700',
          'text-gray-400 dark:text-gray-500',
          'cursor-not-allowed',
        ],
        'transition-all duration-300',
        className
      )}
    >
      {/* Progress Bar Background (visible when loading) */}
      {loading && (
        <div
          className={cn(
            'absolute inset-0',
            'bg-primary-200 dark:bg-primary-800/50'
          )}
        >
          {/* Progress Fill */}
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0',
              'bg-primary-400 dark:bg-primary-600',
              'transition-all duration-300 ease-out'
            )}
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      )}

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <IconLoader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-2">
              <span>{stage || 'Analyzing'}</span>
              <span className="text-xs sm:text-sm font-medium opacity-80">
                {normalizedProgress}%
              </span>
            </span>
          </>
        ) : (
          <>
            <IconPlant className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Analyze Crop</span>
          </>
        )}
      </span>
    </Button>
  );
}

/**
 * AnalyzeButtonCompact - A smaller version for inline usage
 */
export function AnalyzeButtonCompact({
  onClick,
  loading = false,
  disabled = false,
  progress = 0,
  className,
}: Omit<AnalyzeButtonProps, 'stage'>) {
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isDisabled = disabled || loading;

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      size="sm"
      className={cn(
        'relative overflow-hidden',
        !loading && !disabled && [
          'bg-gradient-to-r from-primary-600 to-primary-500',
          'hover:from-primary-700 hover:to-primary-600',
        ],
        loading && [
          'bg-primary-100 dark:bg-primary-900/50',
          'text-primary-700 dark:text-primary-300',
        ],
        className
      )}
    >
      {loading && (
        <div
          className="absolute left-0 top-0 bottom-0 bg-primary-400 dark:bg-primary-600 transition-all duration-300"
          style={{ width: `${normalizedProgress}%` }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {loading ? (
          <>
            <IconLoader2 className="w-4 h-4 animate-spin" />
            <span>{normalizedProgress}%</span>
          </>
        ) : (
          <>
            <IconPlant className="w-4 h-4" />
            <span>Analyze</span>
          </>
        )}
      </span>
    </Button>
  );
}

export default AnalyzeButton;
