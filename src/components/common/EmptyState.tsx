'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Size variants for the empty state */
type EmptyStateSize = 'sm' | 'md' | 'lg';

interface EmptyStateProps {
  /** Main message */
  message: string;
  /** Optional icon component */
  icon?: ReactNode;
  /** Optional description */
  description?: string;
  /** Optional action element */
  action?: ReactNode;
  /** Size variant (default: 'md') */
  size?: EmptyStateSize;
  /** Additional className for container */
  className?: string;
}

/**
 * Reusable empty state component.
 * Shows when there's no data to display.
 * Responsive by default - uses larger icon/text on mobile for better visibility.
 */
export function EmptyState({
  message,
  icon,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  // Responsive size styles - larger on mobile for better touch/visibility
  const sizeStyles = {
    sm: {
      container: 'py-6 sm:py-6 px-4 sm:px-3',
      message: 'text-sm sm:text-sm',
      description: 'text-xs sm:text-xs',
    },
    md: {
      container: 'py-10 sm:py-12 px-4 sm:px-4',
      message: 'text-base sm:text-base',
      description: 'text-sm sm:text-sm',
    },
    lg: {
      container: 'py-12 sm:py-16 px-5 sm:px-6',
      message: 'text-lg sm:text-lg',
      description: 'text-sm sm:text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      styles.container,
      className
    )}>
      {icon && <div className="mb-3 sm:mb-4">{icon}</div>}
      <p className={cn('text-muted-foreground font-medium', styles.message)}>
        {message}
      </p>
      {description && (
        <p className={cn('text-muted-foreground mt-1.5 sm:mt-1 max-w-xs sm:max-w-sm', styles.description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4 sm:mt-4 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
