'use client';

import { useMemo } from 'react';
import { IconPhoto, IconClock, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import { HistoryCardImage } from './HistoryCardImage';
import { AnalysisHistoryItem, CropHealthStatus, AnalysisStatus } from '@/types/crop-ai';

// TYPES

export interface HistoryCardProps {
  /** Analysis history item */
  analysis: AnalysisHistoryItem;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the card is selected */
  isSelected?: boolean;
}

// HEALTH STATUS CONFIGURATIONS

interface HealthConfigBase {
  color: string;
  bgColor: string;
  borderColor: string;
  labelKey: string;
}

const HEALTH_CONFIG: Record<CropHealthStatus, HealthConfigBase> = {
  healthy: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-500',
    labelKey: 'cropAi.history.healthy',
  },
  moderate: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-500',
    labelKey: 'cropAi.history.moderate',
  },
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
    labelKey: 'cropAi.history.critical',
  },
};

// STATUS CONFIGURATIONS

interface StatusConfigBase {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  labelKey: string;
}

const STATUS_CONFIG: Record<AnalysisStatus, StatusConfigBase> = {
  processing: {
    icon: IconLoader2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    labelKey: 'cropAi.history.processingStatus',
  },
  completed: {
    icon: IconClock,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    labelKey: 'cropAi.history.title',
  },
  failed: {
    icon: IconAlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    labelKey: 'cropAi.history.failedStatus',
  },
};

// HEALTH INDICATOR COMPONENT

interface SmallHealthIndicatorProps {
  health: CropHealthStatus;
  score: number;
}

function SmallHealthIndicator({ health, score }: SmallHealthIndicatorProps) {
  const config = HEALTH_CONFIG[health];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        'px-2 py-1',
        'rounded-full',
        config.bgColor
      )}
    >
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          config.borderColor.replace('border-', 'bg-')
        )}
      />
      <span className={cn('text-xs font-medium', config.color)}>
        {score}%
      </span>
    </div>
  );
}

// STATUS BADGE COMPONENT

interface StatusBadgeProps {
  status: AnalysisStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Don't show badge for completed status
  if (status === 'completed') return null;

  return (
    <div
      className={cn(
        'absolute top-2 left-2 z-10',
        'flex items-center gap-1',
        'text-xs px-2 py-0.5',
        'rounded-full',
        config.bgColor
      )}
    >
      <Icon className={cn('w-3 h-3', config.color, status === 'processing' && 'animate-spin')} />
      <span className={cn('text-xs font-medium', config.color)}>
        {t(config.labelKey)}
      </span>
    </div>
  );
}

/**
 * HistoryCard Component
 * 
 * Compact card for displaying analysis history items.
 * Shows thumbnail, crop type, health indicator, and date.
 */
export function HistoryCard({
  analysis,
  onClick,
  className,
  isSelected = false,
}: HistoryCardProps) {
  const { t } = useTranslation();

  // Format date
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(analysis.analysisDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return t('cropAi.chat.today');
      }
      if (diffDays === 1) {
        return t('cropAi.chat.yesterday');
      }
      if (diffDays < 7) {
        return `${diffDays} ${t('cropAi.chat.daysAgo')}`;
      }

      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return analysis.analysisDate;
    }
  }, [analysis.analysisDate, t]);

  // Count total issues
  const issueCount = analysis.diseaseCount + analysis.deficiencyCount + analysis.pestCount;

  return (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer',
        'min-h-[80px] sm:min-h-[88px]',
        'transition-all duration-150',
        'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700',
        'active:bg-muted/50 active:scale-[0.98]',
        isSelected && 'ring-2 ring-primary-500',
        className
      )}
      onClick={onClick}
    >
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Thumbnail using HistoryCardImage */}
        <div className="relative">
          {/* Status Badge */}
          <StatusBadge status={analysis.status} />

          {analysis.imageThumbnail ? (
            <HistoryCardImage
              imageUrl={analysis.imageThumbnail}
              alt={`${analysis.cropType} analysis`}
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconPhoto className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
          )}

          {/* Health Border Indicator */}
          <div
            className={cn(
              'absolute inset-0 border-2 rounded-lg pointer-events-none',
              HEALTH_CONFIG[analysis.overallHealth].borderColor
            )}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Crop Type */}
          <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white line-clamp-1">
            {analysis.cropType}
          </h4>

          {/* Date */}
          <p className="text-xs text-muted-foreground mt-0.5">
            {formattedDate}
          </p>

          {/* Health & Issues */}
          <div className="flex items-center gap-2 mt-2">
            <SmallHealthIndicator
              health={analysis.overallHealth}
              score={analysis.healthScore}
            />

            {issueCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {issueCount} {t('cropAi.history.issuesDetected')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default HistoryCard;
