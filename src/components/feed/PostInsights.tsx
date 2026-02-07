'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  IconEye,
  IconUsers,
  IconHeart,
  IconMessageCircle,
  IconShare,
  IconBookmark,
  IconUserPlus,
  IconChartBar,
  IconLoader2,
  IconAlertCircle,
  IconRefresh,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trackRender } from '@/lib/performance';

/**
 * Post insights data structure
 */
interface PostInsightsData {
  viewsCount: number;
  uniqueViewersCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savedCount: number;
  profileVisits: number;
  engagementRate: number;
  reach: number;
  helpfulMarksCount: number;
  createdAt: string;
  daysSinceCreation: number;
}

/**
 * Props for PostInsights component
 */
interface PostInsightsProps {
  /** Post ID to fetch insights for */
  postId: string;
  /** Whether to show the component (for conditional rendering) */
  isVisible?: boolean;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Individual metric card component
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'text-gray-600',
  className,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800/50',
        'border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-white dark:bg-gray-700 shadow-sm'
        )}
      >
        <Icon size={20} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {label}
          {subValue && (
            <span className="ml-1 text-gray-400 dark:text-gray-500">
              ({subValue})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format engagement rate for display
 */
function formatEngagementRate(rate: number): string {
  if (rate === 0) return '0%';
  if (rate < 0.01) return '<0.01%';
  return rate.toFixed(2) + '%';
}

/**
 * PostInsights Component
 * Displays post metrics in a clean card for post authors
 */
function PostInsightsComponent({
  postId,
  isVisible = true,
  onClose,
  className,
}: PostInsightsProps) {
  // Track renders in development
  if (process.env.NODE_ENV === 'development') {
    trackRender('PostInsights');
  }
  const [insights, setInsights] = useState<PostInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch insights from API
   */
  const fetchInsights = useCallback(async () => {
    if (!postId) return;

    setIsLoading(true);
    setError(null);

    try {
      const userPhone = localStorage.getItem('userPhone');
      if (!userPhone) {
        setError('Please sign in to view insights');
        return;
      }

      const response = await fetch(`/api/posts/${postId}/insights`, {
        headers: {
          'x-user-phone': userPhone,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      if (data.success && data.insights) {
        setInsights(data.insights);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insights';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // Fetch insights when component becomes visible
  useEffect(() => {
    if (isVisible && !insights && !isLoading) {
      fetchInsights();
    }
  }, [isVisible, insights, isLoading, fetchInsights]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-center py-8">
          <IconLoader2 size={24} className="animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-gray-500">Loading insights...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <IconAlertCircle size={32} className="text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <IconRefresh size={16} className="mr-1" />
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  // No insights state
  if (!insights) {
    return null;
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconChartBar size={20} className="text-primary-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Post Insights
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {insights.daysSinceCreation === 0
              ? 'Today'
              : insights.daysSinceCreation === 1
              ? '1 day ago'
              : `${insights.daysSinceCreation} days ago`}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close insights"
            >
              <IconX size={18} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Engagement Rate Highlight */}
      <div
        className={cn(
          'p-4 rounded-xl text-center',
          'bg-gradient-to-r from-primary-50 to-primary-100',
          'dark:from-primary-900/30 dark:to-primary-800/30',
          'border border-primary-200 dark:border-primary-700'
        )}
      >
        <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
          {formatEngagementRate(insights.engagementRate)}
        </p>
        <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
          Engagement Rate
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={IconEye}
          label="Total Views"
          value={insights.viewsCount}
          color="text-blue-600"
        />
        <MetricCard
          icon={IconUsers}
          label="Reach"
          value={insights.reach}
          subValue="unique"
          color="text-green-600"
        />
        <MetricCard
          icon={IconHeart}
          label="Likes"
          value={insights.likesCount}
          color="text-red-500"
        />
        <MetricCard
          icon={IconMessageCircle}
          label="Comments"
          value={insights.commentsCount}
          color="text-blue-500"
        />
        <MetricCard
          icon={IconShare}
          label="Shares"
          value={insights.sharesCount}
          color="text-purple-600"
        />
        <MetricCard
          icon={IconBookmark}
          label="Saves"
          value={insights.savedCount}
          color="text-yellow-600"
        />
      </div>

      {/* Additional Metrics */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={IconUserPlus}
            label="Profile Visits"
            value={insights.profileVisits}
            subValue="from this post"
            color="text-indigo-600"
          />
          <MetricCard
            icon={IconCheck}
            label="Helpful Marks"
            value={insights.helpfulMarksCount}
            subValue="on comments"
            color="text-emerald-600"
          />
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchInsights}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          <IconRefresh size={14} className="mr-1" />
          Refresh insights
        </Button>
      </div>
    </Card>
  );
}

/**
 * Memoized PostInsights for performance
 * Only re-render if postId, isVisible, or className changes
 */
export const PostInsights = memo(PostInsightsComponent, (prevProps, nextProps) => {
  return (
    prevProps.postId === nextProps.postId &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.className === nextProps.className
  );
});

export default PostInsights;
