'use client';

import { useMemo } from 'react';
import { IconBug, IconDroplet, IconVirus, IconPlant2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CropAnalysisResult } from '@/types/crop-ai';
import { HealthIndicator } from '../common/HealthIndicator';
import { ImagePreview } from '../common/ImagePreview';
import { AnalysisActions } from './AnalysisActions';

// TYPES

export interface AnalysisSummaryProps {
  /** Full analysis result */
  analysis: CropAnalysisResult;
  /** Callback for share action */
  onShare?: () => void;
  /** Callback for save action */
  onSave?: () => void;
  /** Callback for re-analyze action */
  onReanalyze?: () => void;
  /** Whether the analysis is saved */
  isSaved?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Compact mode for list views */
  compact?: boolean;
}

// HELPER COMPONENTS

interface StatBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
}

function StatBadge({ icon: Icon, label, count, colorClass, bgClass }: StatBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'px-3 py-2',
        'rounded-lg',
        bgClass
      )}
    >
      <Icon className={cn('w-4 h-4', colorClass)} />
      <div>
        <span className={cn('font-semibold', colorClass)}>{count}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{label}</span>
      </div>
    </div>
  );
}

/**
 * AnalysisSummary Component
 * 
 * Top section showing analyzed image, health overview, and quick stats.
 * Includes share, save, and re-analyze actions.
 */
export function AnalysisSummary({
  analysis,
  onShare,
  onSave,
  onReanalyze,
  isSaved = false,
  className,
  showActions = true,
  compact = false,
}: AnalysisSummaryProps) {
  // Calculate issue counts
  const issuesCounts = useMemo(() => ({
    diseases: analysis.diseases?.length || 0,
    deficiencies: analysis.nutrientDeficiencies?.length || 0,
    pests: analysis.pests?.length || 0,
    total: (analysis.diseases?.length || 0) + 
           (analysis.nutrientDeficiencies?.length || 0) + 
           (analysis.pests?.length || 0),
  }), [analysis.diseases, analysis.nutrientDeficiencies, analysis.pests]);

  // Calculate suggestions count
  const suggestionsCount = useMemo(() => {
    return (analysis.yieldSuggestions?.length || 0);
  }, [analysis.yieldSuggestions]);

  // Format analysis date
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(analysis.analysisDate);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return analysis.analysisDate;
    }
  }, [analysis.analysisDate]);

  // Get summary text based on health
  const summaryText = useMemo(() => {
    if (analysis.overallHealth === 'healthy') {
      return 'Your crop looks healthy! Follow the suggestions to maintain good health.';
    }
    if (analysis.overallHealth === 'moderate') {
      return 'Some issues detected. Take action on the recommendations below.';
    }
    return 'Critical issues found. Immediate attention required for your crop.';
  }, [analysis.overallHealth]);

  // Compact mode
  if (compact) {
    return (
      <Card className={cn('p-3', className)}>
        <div className="flex items-center gap-3">
          {/* Image Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <ImagePreview
              src={analysis.imageThumbnail || analysis.imageUrl}
              alt="Crop analysis"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {analysis.cropType}
              </span>
              <HealthIndicator healthStatus={analysis.overallHealth} score={analysis.healthScore} size="sm" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formattedDate}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {issuesCounts.diseases > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {issuesCounts.diseases} disease{issuesCounts.diseases > 1 ? 's' : ''}
                </span>
              )}
              {issuesCounts.deficiencies > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {issuesCounts.deficiencies} deficienc{issuesCounts.deficiencies > 1 ? 'ies' : 'y'}
                </span>
              )}
              {issuesCounts.pests > 0 && (
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  {issuesCounts.pests} pest{issuesCounts.pests > 1 ? 's' : ''}
                </span>
              )}
              {issuesCounts.total === 0 && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Healthy
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden p-3 sm:p-4 md:p-6', className)}>
      {/* Image and Health Overview */}
      <div className="flex flex-col sm:flex-row">
        {/* Analyzed Image */}
        <div className="sm:w-1/3 aspect-square sm:aspect-auto">
          <ImagePreview
            src={analysis.imageUrl}
            alt="Analyzed crop"
            className="w-full h-full object-cover"
            showZoom
          />
        </div>

        {/* Health Overview */}
        <div className="flex-1 p-3 sm:p-4 md:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              {/* Crop Type Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/30">
                  <IconPlant2 className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs sm:text-sm font-medium text-primary-700 dark:text-primary-300">
                    {analysis.cropType}
                  </span>
                </div>
                {analysis.cropGrowthStage && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {analysis.cropGrowthStage}
                  </span>
                )}
              </div>

              {/* Health Indicator */}
              <div className="flex items-center gap-3 mb-3">
                <HealthIndicator
                  healthStatus={analysis.overallHealth}
                  score={analysis.healthScore}
                  size="lg"
                  showLabel
                />
              </div>

              {/* Summary Text */}
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 sm:line-clamp-none">
                {summaryText}
              </p>
            </div>
          </div>

          {/* Analysis Date */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Analyzed on {formattedDate}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex flex-wrap gap-2">
          <StatBadge
            icon={IconVirus}
            label="Diseases"
            count={issuesCounts.diseases}
            colorClass={issuesCounts.diseases > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}
            bgClass={issuesCounts.diseases > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-gray-100 dark:bg-gray-800'}
          />
          <StatBadge
            icon={IconDroplet}
            label="Deficiencies"
            count={issuesCounts.deficiencies}
            colorClass={issuesCounts.deficiencies > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}
            bgClass={issuesCounts.deficiencies > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-gray-100 dark:bg-gray-800'}
          />
          <StatBadge
            icon={IconBug}
            label="Pests"
            count={issuesCounts.pests}
            colorClass={issuesCounts.pests > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}
            bgClass={issuesCounts.pests > 0 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-100 dark:bg-gray-800'}
          />
          {suggestionsCount > 0 && (
            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center">
              {suggestionsCount} suggestions available
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <AnalysisActions
            onShare={onShare}
            onSave={onSave}
            onNewAnalysis={onReanalyze}
            isSaved={isSaved}
          />
        </div>
      )}
    </Card>
  );
}

export default AnalysisSummary;
