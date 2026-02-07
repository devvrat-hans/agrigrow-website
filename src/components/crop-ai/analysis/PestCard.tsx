'use client';

import { useState, useCallback } from 'react';
import { IconBug, IconChevronDown, IconChevronUp, IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconShieldCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { PestDetection, DiseaseSeverity } from '@/types/crop-ai';

// TYPES

export interface PestCardProps {
  /** Pest detection data */
  pest: PestDetection;
  /** Whether the card is expanded */
  expanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggle?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Default expanded state (for uncontrolled usage) */
  defaultExpanded?: boolean;
}

// DAMAGE LEVEL CONFIGURATIONS

interface DamageLevelConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DAMAGE_LEVEL_CONFIG: Record<DiseaseSeverity, DamageLevelConfig> = {
  high: {
    label: 'High Damage',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: IconAlertTriangle,
  },
  medium: {
    label: 'Medium Damage',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: IconAlertCircle,
  },
  low: {
    label: 'Low Damage',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: IconInfoCircle,
  },
};

/**
 * PestCard Component
 * 
 * Expandable card showing pest detection details.
 * Displays pest name, damage level, and treatment options.
 */
export function PestCard({
  pest,
  expanded: controlledExpanded,
  onToggle,
  className,
  defaultExpanded = false,
}: PestCardProps) {
  // Internal expanded state for uncontrolled usage
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled or internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [onToggle]);

  // Get damage level config
  const damageConfig = DAMAGE_LEVEL_CONFIG[pest.damageLevel];

  // Convert confidence to percentage
  const confidencePercent = Math.round(pest.confidence * 100);

  // Get damage icon
  const DamageIcon = damageConfig.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        damageConfig.borderColor,
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'p-3 sm:p-4',
          'text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500/20',
          'active:bg-gray-100 dark:active:bg-gray-800'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Pest Icon */}
          <div
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-lg',
              damageConfig.bgColor
            )}
          >
            <IconBug className={cn('w-5 h-5', damageConfig.color)} />
          </div>

          {/* Pest Name and Info */}
          <div className="min-w-0">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {pest.name}
            </h4>
            {pest.scientificName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                {pest.scientificName}
              </p>
            )}
            {!pest.scientificName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {confidencePercent}% confidence
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Damage Level Badge */}
          <div
            className={cn(
              'flex items-center gap-1',
              'rounded-full px-2 py-0.5',
              'text-xs font-medium',
              damageConfig.bgColor,
              damageConfig.color
            )}
          >
            <DamageIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{damageConfig.label}</span>
            <span className="sm:hidden">{pest.damageLevel.charAt(0).toUpperCase()}</span>
          </div>

          {/* Expand Icon */}
          {isExpanded ? (
            <IconChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <IconChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Confidence and Scientific Name */}
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Detection Confidence
              </span>
              <span className={cn('font-medium', damageConfig.color)}>
                {confidencePercent}%
              </span>
            </div>
            {pest.scientificName && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Scientific Name
                </span>
                <span className="text-gray-700 dark:text-gray-300 italic">
                  {pest.scientificName}
                </span>
              </div>
            )}
          </div>

          {/* Treatment Section */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconBug className="w-4 h-4 text-gray-500" />
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Treatment Options
              </h5>
            </div>
            <ul className="space-y-2">
              {pest.treatment.map((treatment, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0',
                      'bg-primary-500'
                    )}
                  />
                  {treatment}
                </li>
              ))}
            </ul>
          </div>

          {/* Prevention Section */}
          {pest.prevention && pest.prevention.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <IconShieldCheck className="w-4 h-4 text-green-500" />
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prevention Tips
                </h5>
              </div>
              <ul className="space-y-2">
                {pest.prevention.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3"
                  >
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default PestCard;
