import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AIAnalytics from '@/models/AIAnalytics';
import { getCache } from '@/lib/ai-cache';

/**
 * GET /api/crop-ai/analytics
 * 
 * Returns comprehensive analytics data for the admin dashboard.
 * Includes aggregated stats, daily trends, error rates, and user usage.
 * 
 * Query Parameters:
 * - days: Number of days to include (default: 7)
 * - operationType: Filter by operation type (chat/diagnosis/planning)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);
    const operationType = searchParams.get('operationType') as 'chat' | 'diagnosis' | 'planning' | null;

    // Calculate date ranges
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch all analytics data in parallel
    const [
      overallStats,
      todayStats,
      yesterdayStats,
      dailyStats,
      topErrors,
      userUsage,
      realtimeStats,
      operationBreakdown,
    ] = await Promise.all([
      // Overall stats for the period
      AIAnalytics.getAggregatedStats(operationType || undefined, startDate, now),
      
      // Today's stats
      AIAnalytics.getAggregatedStats(operationType || undefined, todayStart, now),
      
      // Yesterday's stats (for comparison)
      AIAnalytics.getAggregatedStats(operationType || undefined, yesterdayStart, todayStart),
      
      // Daily breakdown
      AIAnalytics.getDailyStats(days, operationType || undefined),
      
      // Top errors
      AIAnalytics.getTopErrors(10, startDate),
      
      // User usage
      AIAnalytics.getUserUsage(startDate, 20),
      
      // Realtime stats
      AIAnalytics.getRealtimeStats(),
      
      // Operation type breakdown
      getOperationBreakdown(startDate, now),
    ]);

    // Get cache stats
    const cache = getCache();
    const cacheStats = cache.getStats();

    // Calculate trends (comparing today vs yesterday)
    const trends = {
      requests: calculateTrend(todayStats.totalRequests, yesterdayStats.totalRequests),
      errorRate: calculateTrend(todayStats.errorRate, yesterdayStats.errorRate, true),
      responseTime: calculateTrend(todayStats.avgResponseTime, yesterdayStats.avgResponseTime, true),
      cacheHitRate: calculateTrend(todayStats.cacheHitRate, yesterdayStats.cacheHitRate),
    };

    return NextResponse.json({
      success: true,
      data: {
        // Summary metrics
        summary: {
          totalRequests: overallStats.totalRequests,
          successRate: overallStats.totalRequests > 0 
            ? ((overallStats.successCount / overallStats.totalRequests) * 100).toFixed(2) 
            : '0.00',
          errorRate: overallStats.errorRate.toFixed(2),
          avgResponseTime: overallStats.avgResponseTime,
          p95ResponseTime: overallStats.p95ResponseTime,
          cacheHitRate: overallStats.cacheHitRate.toFixed(2),
        },
        
        // Today's stats
        today: {
          totalRequests: todayStats.totalRequests,
          successCount: todayStats.successCount,
          errorCount: todayStats.errorCount,
          avgResponseTime: todayStats.avgResponseTime,
          cacheHitRate: todayStats.cacheHitRate.toFixed(2),
        },
        
        // Trends (vs yesterday)
        trends,
        
        // Realtime
        realtime: realtimeStats,
        
        // Daily breakdown for charts
        daily: dailyStats,
        
        // Operation type breakdown
        operationBreakdown,
        
        // Top errors
        topErrors,
        
        // Top users
        topUsers: userUsage,
        
        // Cache stats
        cache: {
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          hitRate: cacheStats.hitRate.toFixed(2),
          entriesByType: cacheStats.entriesByType,
          memoryMB: (cacheStats.memoryEstimate / 1024 / 1024).toFixed(2),
        },
        
        // Meta
        meta: {
          period: {
            start: startDate.toISOString(),
            end: now.toISOString(),
            days,
          },
          generatedAt: now.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

/**
 * Get breakdown by operation type
 */
async function getOperationBreakdown(startDate: Date, endDate: Date) {
  const [chat, diagnosis, planning] = await Promise.all([
    AIAnalytics.getAggregatedStats('chat', startDate, endDate),
    AIAnalytics.getAggregatedStats('diagnosis', startDate, endDate),
    AIAnalytics.getAggregatedStats('planning', startDate, endDate),
  ]);

  const total = chat.totalRequests + diagnosis.totalRequests + planning.totalRequests;

  return {
    chat: {
      requests: chat.totalRequests,
      percentage: total > 0 ? ((chat.totalRequests / total) * 100).toFixed(2) : '0.00',
      avgResponseTime: chat.avgResponseTime,
      errorRate: chat.errorRate.toFixed(2),
      cacheHitRate: chat.cacheHitRate.toFixed(2),
    },
    diagnosis: {
      requests: diagnosis.totalRequests,
      percentage: total > 0 ? ((diagnosis.totalRequests / total) * 100).toFixed(2) : '0.00',
      avgResponseTime: diagnosis.avgResponseTime,
      errorRate: diagnosis.errorRate.toFixed(2),
      cacheHitRate: diagnosis.cacheHitRate.toFixed(2),
    },
    planning: {
      requests: planning.totalRequests,
      percentage: total > 0 ? ((planning.totalRequests / total) * 100).toFixed(2) : '0.00',
      avgResponseTime: planning.avgResponseTime,
      errorRate: planning.errorRate.toFixed(2),
      cacheHitRate: planning.cacheHitRate.toFixed(2),
    },
  };
}

/**
 * Calculate trend percentage
 * @param current Current value
 * @param previous Previous value
 * @param invertPositive If true, lower is better (e.g., error rate)
 */
function calculateTrend(
  current: number, 
  previous: number, 
  invertPositive = false
): { value: string; direction: 'up' | 'down' | 'stable'; isPositive: boolean } {
  if (previous === 0) {
    if (current === 0) {
      return { value: '0', direction: 'stable', isPositive: true };
    }
    return { 
      value: '∞', 
      direction: 'up', 
      isPositive: !invertPositive 
    };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const direction = percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'stable';
  const isPositive = invertPositive ? percentChange <= 0 : percentChange >= 0;

  return {
    value: Math.abs(percentChange).toFixed(1),
    direction,
    isPositive,
  };
}
