'use client';

import { useMemo } from 'react';
import { IconPlant, IconLeaf } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { HealthIndicator } from '../common/HealthIndicator';
import { CropHealthStatus } from '@/types/crop-ai';

// TYPES

export interface HealthOverviewProps {
  /** Health status of the crop */
  healthStatus: CropHealthStatus;
  /** Health score from 0-100 */
  healthScore: number;
  /** Type of crop being analyzed */
  cropType?: string;
  /** Growth stage of the crop */
  growthStage?: string;
  /** Additional CSS classes */
  className?: string;
}

// STATUS CONFIGURATIONS

const STATUS_CONFIG = {
  healthy: {
    bgGradient: 'from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    summaryColor: 'text-green-800 dark:text-green-300',
    summary: 'Your crop is in excellent condition! Continue with regular maintenance for optimal growth.',
    icon: '🌿',
  },
  moderate: {
    bgGradient: 'from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    summaryColor: 'text-yellow-800 dark:text-yellow-300',
    summary: 'Your crop shows some signs of stress. Review the recommendations below for improvement.',
    icon: '⚠️',
  },
  critical: {
    bgGradient: 'from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    summaryColor: 'text-red-800 dark:text-red-300',
    summary: 'Your crop requires immediate attention! Follow the treatment recommendations urgently.',
    icon: '🚨',
  },
} as const;

// GROWTH STAGE LABELS

const GROWTH_STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling Stage',
  vegetative: 'Vegetative Stage',
  flowering: 'Flowering Stage',
  fruiting: 'Fruiting Stage',
  maturity: 'Maturity Stage',
  harvest: 'Ready for Harvest',
};

/**
 * HealthOverview Component
 * 
 * Card component displaying the main health indicator with crop details.
 * Background color is tinted based on health status.
 * 
 * @example
 * <HealthOverview 
 *   healthStatus="healthy" 
 *   healthScore={85} 
 *   cropType="Rice"
 *   growthStage="vegetative"
 * />
 */
export function HealthOverview({
  healthStatus,
  healthScore,
  cropType,
  growthStage,
  className,
}: HealthOverviewProps) {
  // Get status configuration
  const statusConfig = useMemo(() => {
    return STATUS_CONFIG[healthStatus] || STATUS_CONFIG.moderate;
  }, [healthStatus]);

  // Get growth stage label
  const growthStageLabel = useMemo(() => {
    if (!growthStage) return null;
    return GROWTH_STAGE_LABELS[growthStage.toLowerCase()] || growthStage;
  }, [growthStage]);

  // Format crop type for display
  const displayCropType = useMemo(() => {
    if (!cropType) return null;
    return cropType.charAt(0).toUpperCase() + cropType.slice(1).toLowerCase();
  }, [cropType]);

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        'border',
        statusConfig.borderColor,
        className
      )}
    >
      {/* Background Gradient */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-br',
          statusConfig.bgGradient
        )}
      />

      {/* Content */}
      <div className="relative p-3 sm:p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 md:gap-6">
          {/* Health Indicator */}
          <div className="flex-shrink-0">
            <HealthIndicator
              healthStatus={healthStatus}
              score={healthScore}
              size="lg"
              showLabel
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left">
            {/* Crop Type Badge */}
            {displayCropType && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'px-2.5 sm:px-3 py-1 rounded-full',
                    'bg-white/70 dark:bg-gray-800/70',
                    'text-xs sm:text-sm font-medium',
                    'text-gray-700 dark:text-gray-300'
                  )}
                >
                  <IconPlant className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-600 dark:text-primary-400" />
                  {displayCropType}
                </span>
              </div>
            )}

            {/* Growth Stage */}
            {growthStageLabel && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'text-xs sm:text-sm font-medium',
                    'text-gray-600 dark:text-gray-400'
                  )}
                >
                  <IconLeaf className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {growthStageLabel}
                </span>
              </div>
            )}

            {/* Summary Text */}
            <div className="flex items-start gap-2">
              <span className="text-base sm:text-lg" role="img" aria-hidden="true">
                {statusConfig.icon}
              </span>
              <p
                className={cn(
                  'text-xs sm:text-sm md:text-base',
                  'leading-relaxed',
                  statusConfig.summaryColor
                )}
              >
                {statusConfig.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Health Status Label (Mobile) */}
        <div
          className={cn(
            'mt-3 sm:mt-4 pt-3 sm:pt-4',
            'border-t border-gray-200/50 dark:border-gray-700/50',
            'md:hidden'
          )}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Overall Health
            </span>
            <span
              className={cn(
                'font-semibold capitalize',
                healthStatus === 'healthy' && 'text-green-600 dark:text-green-400',
                healthStatus === 'moderate' && 'text-yellow-600 dark:text-yellow-400',
                healthStatus === 'critical' && 'text-red-600 dark:text-red-400'
              )}
            >
              {healthStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div
        className={cn(
          'absolute -right-8 -bottom-8',
          'w-32 h-32',
          'rounded-full',
          'opacity-10',
          healthStatus === 'healthy' && 'bg-green-500',
          healthStatus === 'moderate' && 'bg-yellow-500',
          healthStatus === 'critical' && 'bg-red-500'
        )}
      />
    </Card>
  );
}

export default HealthOverview;
