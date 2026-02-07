'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IconAlertTriangle, IconRefresh, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Error details structure for logging
 */
interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

/**
 * Props for FeedErrorBoundary component
 */
interface FeedErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether to show detailed error info (dev mode) */
  showDetails?: boolean;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State for FeedErrorBoundary component
 */
interface FeedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isCollapsed: boolean;
}

/**
 * FeedErrorBoundary Component
 * 
 * React error boundary that catches errors in feed components and displays
 * a friendly error message with retry functionality.
 * 
 * Features:
 * - Catches JavaScript errors in child components
 * - Logs detailed error information for debugging
 * - Shows user-friendly error message
 * - Provides retry button to recover from errors
 * - Supports custom fallback UI
 */
export class FeedErrorBoundary extends Component<FeedErrorBoundaryProps, FeedErrorBoundaryState> {
  constructor(props: FeedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isCollapsed: true,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<FeedErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info in state
    this.setState({ errorInfo });

    // Create detailed error log
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Feed Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Details:', errorDetails);
      console.groupEnd();
    }

    // Log to console in production (consider sending to error tracking service)
    console.error('[FeedErrorBoundary] Error caught:', {
      message: error.message,
      timestamp: errorDetails.timestamp,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Handle retry button click
   */
  handleRetry = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call onRetry callback if provided
    this.props.onRetry?.();
  };

  /**
   * Toggle error details visibility
   */
  handleToggleDetails = (): void => {
    this.setState((prev) => ({ isCollapsed: !prev.isCollapsed }));
  };

  /**
   * Dismiss error without retry
   */
  handleDismiss = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, isCollapsed } = this.state;
    const { children, fallback, className, showDetails } = this.props;

    if (hasError) {
      // Custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div
          className={cn(
            'mx-4 my-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl',
            'border border-red-200 dark:border-red-800',
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          {/* Error Header */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <IconAlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Something went wrong
              </h3>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                We encountered an error while loading the feed. This has been logged for review.
              </p>
            </div>
            <button
              onClick={this.handleDismiss}
              className="flex-shrink-0 p-1 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              aria-label="Dismiss error"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={this.handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <IconRefresh size={16} className="mr-2" />
              Try Again
            </Button>
            {(showDetails || process.env.NODE_ENV === 'development') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleToggleDetails}
                className="text-red-600 dark:text-red-400 hover:text-red-700"
              >
                {isCollapsed ? 'Show Details' : 'Hide Details'}
              </Button>
            )}
          </div>

          {/* Error Details (collapsible, dev mode) */}
          {!isCollapsed && (showDetails || process.env.NODE_ENV === 'development') && (
            <div className="mt-4 p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg overflow-auto">
              <p className="text-xs font-mono text-red-700 dark:text-red-300 mb-2">
                <strong>Error:</strong> {error?.message}
              </p>
              {error?.stack && (
                <pre className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {error.stack}
                </pre>
              )}
              {errorInfo?.componentStack && (
                <pre className="mt-2 text-xs font-mono text-red-500 dark:text-red-500 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}

export default FeedErrorBoundary;
