'use client';

import { useState } from 'react';
import {
  IconAlertTriangle,
  IconWifi,
  IconServer,
  IconRefresh,
  IconMail,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// TYPES

export interface AnalysisErrorInfo {
  /** Error code or type */
  code?: string;
  /** Human-readable error message */
  message: string;
  /** Detailed technical error (for debugging) */
  details?: string;
  /** Whether this is a network error */
  isNetworkError?: boolean;
  /** Whether this is a rate limit error */
  isRateLimitError?: boolean;
  /** Retry attempt count */
  retryCount?: number;
}

export interface AnalysisErrorProps {
  /** Error information object */
  error: AnalysisErrorInfo | string;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Whether retry is currently in progress */
  retrying?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// HELPER FUNCTIONS

/**
 * Normalize error to AnalysisErrorInfo format
 */
function normalizeError(error: AnalysisErrorInfo | string): AnalysisErrorInfo {
  if (typeof error === 'string') {
    return {
      message: error,
      isNetworkError: error.toLowerCase().includes('network') || 
                      error.toLowerCase().includes('connection') ||
                      error.toLowerCase().includes('offline'),
    };
  }
  return error;
}

/**
 * Get error type for styling
 */
function getErrorType(error: AnalysisErrorInfo): 'network' | 'api' | 'rate_limit' | 'generic' {
  if (error.isNetworkError) return 'network';
  if (error.isRateLimitError) return 'rate_limit';
  if (error.code?.startsWith('5') || error.code === 'server_error') return 'api';
  return 'generic';
}

// ERROR TYPE CONFIGS

interface ErrorTypeConfig {
  icon: React.ElementType;
  title: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  textColor: string;
  suggestion: string;
}

const ERROR_TYPE_CONFIGS: Record<string, ErrorTypeConfig> = {
  network: {
    icon: IconWifi,
    title: 'Connection Error',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-500 dark:text-orange-400',
    textColor: 'text-orange-700 dark:text-orange-300',
    suggestion: 'Please check your internet connection and try again.',
  },
  api: {
    icon: IconServer,
    title: 'Server Error',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500 dark:text-red-400',
    textColor: 'text-red-700 dark:text-red-300',
    suggestion: 'Our servers are experiencing issues. Please try again in a few minutes.',
  },
  rate_limit: {
    icon: IconAlertTriangle,
    title: 'Too Many Requests',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500 dark:text-yellow-400',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    suggestion: 'You have made too many requests. Please wait a moment before trying again.',
  },
  generic: {
    icon: IconAlertTriangle,
    title: 'Analysis Failed',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500 dark:text-red-400',
    textColor: 'text-red-700 dark:text-red-300',
    suggestion: 'Something went wrong while analyzing your crop image.',
  },
};

// SUPPORT EMAIL
const SUPPORT_EMAIL = 'support@agrigrow.com';

/**
 * AnalysisError Component
 * 
 * Displays error messages with appropriate styling based on error type.
 * Supports retry functionality and shows contact support for persistent errors.
 * 
 * @example
 * <AnalysisError
 *   error={{ message: 'Failed to analyze image', isNetworkError: true }}
 *   onRetry={() => handleRetry()}
 * />
 */
export function AnalysisError({
  error,
  onRetry,
  retrying = false,
  className,
}: AnalysisErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const errorInfo = normalizeError(error);
  const errorType = getErrorType(errorInfo);
  const config = ERROR_TYPE_CONFIGS[errorType];
  const Icon = config.icon;

  // Show persistent error help after multiple retries
  const showPersistentHelp = (errorInfo.retryCount ?? 0) >= 2;

  return (
    <Card
      className={cn(
        'p-6',
        config.bgColor,
        config.borderColor,
        'border',
        className
      )}
    >
      <div className="flex flex-col items-center text-center gap-4">
        {/* Error Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            errorType === 'network' ? 'bg-orange-100 dark:bg-orange-900/30' :
            errorType === 'rate_limit' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
            'bg-red-100 dark:bg-red-900/30'
          )}
        >
          <Icon className={cn('w-8 h-8', config.iconColor)} />
        </div>

        {/* Error Title */}
        <h3 className={cn('text-lg font-semibold', config.textColor)}>
          {config.title}
        </h3>

        {/* Error Message */}
        <div className="space-y-2">
          <p className={cn('text-sm', config.textColor)}>
            {errorInfo.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.suggestion}
          </p>
        </div>

        {/* Error Details (Collapsible) */}
        {errorInfo.details && (
          <div className="w-full">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <span>Technical details</span>
              {showDetails ? (
                <IconChevronUp className="w-3 h-3" />
              ) : (
                <IconChevronDown className="w-3 h-3" />
              )}
            </button>
            
            {showDetails && (
              <div className="mt-2 p-3 rounded-md bg-gray-100 dark:bg-gray-800 text-left">
                <code className="text-xs text-muted-foreground break-all">
                  {errorInfo.code && <span className="block">Code: {errorInfo.code}</span>}
                  {errorInfo.details}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Retry Button */}
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={retrying}
              className="w-full sm:w-auto"
            >
              <IconRefresh
                className={cn(
                  'w-4 h-4 mr-2',
                  retrying && 'animate-spin'
                )}
              />
              {retrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}

          {/* Contact Support - Show after multiple failures */}
          {showPersistentHelp && (
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Crop AI Analysis Error&body=Error: ${encodeURIComponent(errorInfo.message)}${errorInfo.code ? `%0ACode: ${encodeURIComponent(errorInfo.code)}` : ''}`}
                className="flex items-center gap-2"
              >
                <IconMail className="w-4 h-4" />
                Contact Support
              </a>
            </Button>
          )}
        </div>

        {/* Persistent Error Notice */}
        {showPersistentHelp && (
          <p className="text-xs text-muted-foreground mt-2">
            Having persistent issues? Our support team is here to help.
          </p>
        )}

        {/* Retry Count Indicator */}
        {errorInfo.retryCount !== undefined && errorInfo.retryCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Retry attempt {errorInfo.retryCount} of 3
          </p>
        )}
      </div>
    </Card>
  );
}
