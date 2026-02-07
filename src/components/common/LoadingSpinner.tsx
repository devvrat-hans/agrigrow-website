'use client';

import { IconLoader2 } from '@tabler/icons-react';

interface LoadingSpinnerProps {
  /** Size of the spinner (default: md) */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show full screen overlay */
  fullScreen?: boolean;
  /** Text to display below spinner */
  text?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * Reusable loading spinner component.
 * Can be used inline or as full screen overlay.
 */
export function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  text,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <IconLoader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
