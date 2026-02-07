'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DiseaseSeverity } from '@/types/crop-ai';

// TYPES

export interface DiseaseBadgeProps {
  /** Severity level of the disease */
  severity: DiseaseSeverity;
  /** Confidence level from 0-1 */
  confidence: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show confidence percentage */
  showConfidence?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

// SEVERITY CONFIGURATIONS

const SEVERITY_CONFIG = {
  low: {
    bg: 'bg-green-100 dark:bg-green-950/50',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500 dark:bg-green-400',
    label: 'Low',
  },
  medium: {
    bg: 'bg-yellow-100 dark:bg-yellow-950/50',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    dot: 'bg-yellow-500 dark:bg-yellow-400',
    label: 'Medium',
  },
  high: {
    bg: 'bg-red-100 dark:bg-red-950/50',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500 dark:bg-red-400',
    label: 'High',
  },
} as const;

// SIZE CONFIGURATIONS

const SIZE_CONFIG = {
  sm: {
    padding: 'px-1.5 py-0.5',
    text: 'text-[10px]',
    dot: 'w-1.5 h-1.5',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    dot: 'w-2 h-2',
    gap: 'gap-1.5',
  },
} as const;

/**
 * DiseaseBadge Component
 * 
 * Displays a small pill-shaped badge showing disease severity and confidence.
 * Color-coded: green for low severity, yellow for medium, red for high.
 * 
 * @example
 * <DiseaseBadge severity="high" confidence={0.92} />
 * <DiseaseBadge severity="low" confidence={0.75} showConfidence={false} />
 */
export function DiseaseBadge({
  severity,
  confidence,
  className,
  showConfidence = true,
  size = 'md',
}: DiseaseBadgeProps) {
  // Convert confidence to percentage
  const confidencePercent = useMemo(() => {
    const percent = Math.round(confidence * 100);
    return Math.max(0, Math.min(100, percent));
  }, [confidence]);

  // Get configurations
  const severityConfig = SEVERITY_CONFIG[severity];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'rounded-full border',
        'font-medium',
        'whitespace-nowrap',
        sizeConfig.padding,
        sizeConfig.text,
        sizeConfig.gap,
        severityConfig.bg,
        severityConfig.text,
        severityConfig.border,
        className
      )}
      role="status"
      aria-label={`Severity: ${severityConfig.label}${showConfidence ? `, Confidence: ${confidencePercent}%` : ''}`}
    >
      {/* Severity Indicator Dot */}
      <span
        className={cn(
          'rounded-full flex-shrink-0',
          sizeConfig.dot,
          severityConfig.dot
        )}
        aria-hidden="true"
      />
      
      {/* Severity Label */}
      <span className="capitalize">{severityConfig.label}</span>
      
      {/* Confidence Percentage */}
      {showConfidence && (
        <>
          <span className="opacity-50" aria-hidden="true">•</span>
          <span>{confidencePercent}%</span>
        </>
      )}
    </span>
  );
}

/**
 * DiseaseBadgeMinimal Component
 * 
 * A more compact version showing only the severity dot and optional confidence.
 */
export function DiseaseBadgeMinimal({
  severity,
  confidence,
  className,
}: Omit<DiseaseBadgeProps, 'size' | 'showConfidence'>) {
  const confidencePercent = Math.round(confidence * 100);
  const severityConfig = SEVERITY_CONFIG[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'text-[10px] font-medium',
        severityConfig.text,
        className
      )}
      role="status"
      aria-label={`Severity: ${severityConfig.label}, Confidence: ${confidencePercent}%`}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          severityConfig.dot
        )}
        aria-hidden="true"
      />
      <span>{confidencePercent}%</span>
    </span>
  );
}

export default DiseaseBadge;
