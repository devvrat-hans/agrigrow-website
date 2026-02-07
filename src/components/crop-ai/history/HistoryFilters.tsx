'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconFilter, IconX, IconChevronDown, IconChevronUp, IconPlant2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalysisFilters, CropHealthStatus } from '@/types/crop-ai';

// TYPES

export interface HistoryFiltersProps {
  /** Current filter values */
  filters: AnalysisFilters;
  /** Callback when filters change */
  onChange: (filters: AnalysisFilters) => void;
  /** Available crop types for filter */
  cropTypes?: string[];
  /** Additional CSS classes */
  className?: string;
}

// DATE RANGE OPTIONS

interface DateRangeOption {
  value: string;
  label: string;
}

const DATE_RANGE_OPTIONS: (DateRangeOption & { labelKey: string })[] = [
  { value: 'all', label: 'All Time', labelKey: 'cropAi.history.allTime' },
  { value: 'week', label: 'This Week', labelKey: 'cropAi.history.lastWeek' },
  { value: 'month', label: 'This Month', labelKey: 'cropAi.history.lastMonth' },
  { value: '3months', label: 'Last 3 Months', labelKey: 'cropAi.history.allDates' },
];

// HEALTH STATUS OPTIONS

interface HealthStatusOption {
  value: string;
  label: string;
  color?: string;
}

const HEALTH_STATUS_OPTIONS: (HealthStatusOption & { labelKey: string })[] = [
  { value: 'all', label: 'All Status', labelKey: 'cropAi.history.allStatuses' },
  { value: 'healthy', label: 'Healthy', color: 'text-green-600', labelKey: 'cropAi.history.healthy' },
  { value: 'moderate', label: 'Moderate', color: 'text-amber-600', labelKey: 'cropAi.history.moderate' },
  { value: 'critical', label: 'Critical', color: 'text-red-600', labelKey: 'cropAi.history.critical' },
];

// HELPER FUNCTIONS

function getDateRangeFromOption(option: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (option) {
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { dateFrom: weekStart.toISOString(), dateTo: now.toISOString() };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: monthStart.toISOString(), dateTo: now.toISOString() };
    }
    case '3months': {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      return { dateFrom: threeMonthsAgo.toISOString(), dateTo: now.toISOString() };
    }
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }
}

function getDateRangeOption(dateFrom?: string): string {
  if (!dateFrom) return 'all';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fromDate = new Date(dateFrom);

  // Check week
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  if (fromDate >= weekStart) return 'week';

  // Check month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  if (fromDate >= monthStart) return 'month';

  // Check 3 months
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  if (fromDate >= threeMonthsAgo) return '3months';

  return 'all';
}

/**
 * HistoryFilters Component
 * 
 * Horizontal filter bar for analysis history.
 * Collapsible on mobile.
 */
export function HistoryFilters({
  filters,
  onChange,
  cropTypes = [],
  className,
}: HistoryFiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle crop type change
  const handleCropTypeChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        cropType: value === 'all' ? undefined : value,
      });
    },
    [filters, onChange]
  );

  // Handle health status change
  const handleHealthStatusChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        healthStatus: value === 'all' ? undefined : (value as CropHealthStatus),
      });
    },
    [filters, onChange]
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (value: string) => {
      const { dateFrom, dateTo } = getDateRangeFromOption(value);
      onChange({
        ...filters,
        dateFrom,
        dateTo,
      });
    },
    [filters, onChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    onChange({});
  }, [onChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.cropType || filters.healthStatus || filters.dateFrom || filters.dateTo;

  // Get current values
  const currentCropType = filters.cropType || 'all';
  const currentHealthStatus = filters.healthStatus || 'all';
  const currentDateRange = getDateRangeOption(filters.dateFrom);

  // Render filter controls
  const renderFilters = () => (
    <div className="flex flex-wrap gap-2">
      {/* Crop Type Filter */}
      <Select value={currentCropType} onValueChange={handleCropTypeChange}>
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <div className="flex items-center gap-2">
            <IconPlant2 className="w-4 h-4 text-gray-500" />
            <SelectValue placeholder={t('cropAi.history.cropType')} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('cropAi.history.allCrops')}</SelectItem>
          {cropTypes.map((crop) => (
            <SelectItem key={crop} value={crop}>
              {crop}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Health Status Filter */}
      <Select value={currentHealthStatus} onValueChange={handleHealthStatusChange}>
        <SelectTrigger className="w-[130px] h-9 text-sm">
          <SelectValue placeholder={t('cropAi.history.healthStatus')} />
        </SelectTrigger>
        <SelectContent>
          {HEALTH_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className={option.color}>{t(option.labelKey)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select value={currentDateRange} onValueChange={handleDateRangeChange}>
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue placeholder={t('cropAi.history.dateRange')} />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-3 text-gray-600 dark:text-gray-400"
        >
          <IconX className="w-4 h-4 mr-1" />
          {t('cropAi.history.clearFilters')}
        </Button>
      )}
    </div>
  );

  // Mobile collapsible view
  if (isMobile) {
    return (
      <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleExpanded}
          className={cn(
            'w-full flex items-center justify-between',
            'px-4 py-3',
            'text-sm font-medium',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-50 dark:hover:bg-gray-800/50',
            'transition-colors duration-150'
          )}
        >
          <div className="flex items-center gap-2">
            <IconFilter className="w-4 h-4" />
            <span>{t('cropAi.history.filterByType')}</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <IconChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <IconChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
            {renderFilters()}
          </div>
        )}
      </div>
    );
  }

  // Desktop horizontal view
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        'p-3',
        'bg-white dark:bg-gray-900',
        'rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconFilter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('cropAi.history.filterByType')}
        </span>
      </div>

      {renderFilters()}
    </div>
  );
}

export default HistoryFilters;
