'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  /** Error message to display */
  message: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Whether to show full screen */
  fullScreen?: boolean;
  /** Additional content below error message */
  children?: ReactNode;
}

/**
 * Reusable error state component.
 * Shows error message with optional action button.
 */
export function ErrorState({
  message,
  actionLabel,
  onAction,
  fullScreen = false,
  children,
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <p className="text-destructive mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
      {children}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
