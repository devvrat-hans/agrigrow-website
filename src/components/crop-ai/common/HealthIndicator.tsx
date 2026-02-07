'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CropHealthStatus } from '@/types/crop-ai';

// TYPES

export type HealthIndicatorSize = 'sm' | 'md' | 'lg';

export interface HealthIndicatorProps {
  /** Health status of the crop */
  healthStatus: CropHealthStatus;
  /** Health score from 0-100 */
  score: number;
  /** Size variant of the indicator */
  size?: HealthIndicatorSize;
  /** Whether to show the health status label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// SIZE CONFIGURATIONS
// Note: 'lg' size now uses CSS classes for responsive sizing

const SIZE_CONFIG = {
  sm: {
    container: 'w-12 h-12',
    ring: 'w-12 h-12',
    strokeWidth: 3,
    fontSize: 'text-xs',
    labelSize: 'text-[10px]',
    radius: 20,
  },
  md: {
    container: 'w-20 h-20',
    ring: 'w-20 h-20',
    strokeWidth: 4,
    fontSize: 'text-base',
    labelSize: 'text-xs',
    radius: 34,
  },
  lg: {
    container: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32',
    ring: 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32',
    strokeWidth: 5,
    fontSize: 'text-xl sm:text-2xl',
    labelSize: 'text-xs sm:text-sm',
    radius: 50,
  },
} as const;

// COLOR CONFIGURATIONS

const STATUS_CONFIG = {
  healthy: {
    color: 'text-green-500 dark:text-green-400',
    strokeColor: 'stroke-green-500 dark:stroke-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    label: 'Healthy',
  },
  moderate: {
    color: 'text-yellow-500 dark:text-yellow-400',
    strokeColor: 'stroke-yellow-500 dark:stroke-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    label: 'Moderate',
  },
  critical: {
    color: 'text-red-500 dark:text-red-400',
    strokeColor: 'stroke-red-500 dark:stroke-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    label: 'Critical',
  },
} as const;

/**
 * Derives health status from score if not explicitly provided or for validation
 */
function getStatusFromScore(score: number): CropHealthStatus {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'moderate';
  return 'critical';
}

/**
 * HealthIndicator Component
 * 
 * Displays a circular progress indicator showing crop health status and score.
 * Uses color coding: green (healthy 70-100), yellow (moderate 40-69), red (critical 0-39).
 * 
 * @example
 * <HealthIndicator healthStatus="healthy" score={85} size="md" showLabel />
 */
export function HealthIndicator({
  healthStatus,
  score,
  size = 'md',
  showLabel = true,
  className,
}: HealthIndicatorProps) {
  // Normalize score to 0-100 range
  const normalizedScore = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [score]);

  // Derive status from score for validation (use provided status if consistent)
  const derivedStatus = useMemo(() => {
    const scoreBasedStatus = getStatusFromScore(normalizedScore);
    // Use the provided status as long as it's valid
    return healthStatus || scoreBasedStatus;
  }, [healthStatus, normalizedScore]);

  // Get configurations
  const sizeConfig = SIZE_CONFIG[size];
  const statusConfig = STATUS_CONFIG[derivedStatus];

  // Calculate SVG properties
  const circumference = useMemo(() => {
    return 2 * Math.PI * sizeConfig.radius;
  }, [sizeConfig.radius]);

  const strokeDashoffset = useMemo(() => {
    return circumference - (normalizedScore / 100) * circumference;
  }, [circumference, normalizedScore]);

  // SVG viewBox center
  const viewBoxSize = (sizeConfig.radius + sizeConfig.strokeWidth) * 2;
  const center = viewBoxSize / 2;

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center justify-center',
        className
      )}
      role="progressbar"
      aria-valuenow={normalizedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Health score: ${normalizedScore}%, Status: ${statusConfig.label}`}
    >
      {/* Circular Progress Ring */}
      <div className={cn('relative', sizeConfig.container)}>
        <svg
          className={cn(sizeConfig.ring, 'transform -rotate-90')}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        >
          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            strokeWidth={sizeConfig.strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          {/* Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={sizeConfig.radius}
            fill="none"
            strokeWidth={sizeConfig.strokeWidth}
            strokeLinecap="round"
            className={cn(
              statusConfig.strokeColor,
              'transition-all duration-500 ease-out'
            )}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>

        {/* Center Content */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            statusConfig.bgColor,
            'rounded-full'
          )}
        >
          <span
            className={cn(
              sizeConfig.fontSize,
              statusConfig.color,
              'font-bold leading-none'
            )}
          >
            {normalizedScore}
          </span>
          {size !== 'sm' && (
            <span
              className={cn(
                'text-[8px] sm:text-[10px]',
                'text-gray-500 dark:text-gray-400',
                'leading-none mt-0.5'
              )}
            >
              %
            </span>
          )}
        </div>
      </div>

      {/* Health Status Label */}
      {showLabel && (
        <span
          className={cn(
            sizeConfig.labelSize,
            statusConfig.color,
            'font-medium mt-1.5 md:mt-2',
            'capitalize'
          )}
        >
          {statusConfig.label}
        </span>
      )}
    </div>
  );
}

/**
 * Compact Health Indicator for inline usage (e.g., in lists)
 */
export function HealthIndicatorCompact({
  healthStatus,
  score,
  className,
}: Omit<HealthIndicatorProps, 'size' | 'showLabel'>) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const derivedStatus = healthStatus || getStatusFromScore(normalizedScore);
  const statusConfig = STATUS_CONFIG[derivedStatus];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        statusConfig.bgColor,
        className
      )}
      role="status"
      aria-label={`Health: ${normalizedScore}% - ${statusConfig.label}`}
    >
      {/* Small dot indicator */}
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          derivedStatus === 'healthy' && 'bg-green-500 dark:bg-green-400',
          derivedStatus === 'moderate' && 'bg-yellow-500 dark:bg-yellow-400',
          derivedStatus === 'critical' && 'bg-red-500 dark:bg-red-400'
        )}
      />
      <span
        className={cn(
          'text-xs font-medium',
          statusConfig.color
        )}
      >
        {normalizedScore}%
      </span>
    </div>
  );
}

export default HealthIndicator;
