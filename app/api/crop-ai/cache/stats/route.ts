import { NextResponse } from 'next/server';
import { getCache } from '@/lib/ai-cache';

/**
 * GET /api/crop-ai/cache/stats
 * 
 * Returns cache statistics for monitoring and debugging.
 * This endpoint can be used to monitor cache health and hit rates.
 */
export async function GET() {
  const cache = getCache();
  const stats = cache.getStats();
  const config = cache.getConfig();

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        size: stats.size,
        maxSize: stats.maxSize,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        entriesByType: stats.entriesByType,
        averageAgeSeconds: Math.round(stats.averageAge),
        memoryEstimateMB: (stats.memoryEstimate / 1024 / 1024).toFixed(2),
      },
      config: {
        enabled: config.enabled,
        maxSize: config.maxSize,
        defaultTtlMinutes: Math.round(config.defaultTtl / 60000),
        chatTtlMinutes: Math.round(config.chatTtl / 60000),
        diagnosisTtlMinutes: Math.round(config.diagnosisTtl / 60000),
        planningTtlMinutes: Math.round(config.planningTtl / 60000),
      },
    },
  });
}

/**
 * DELETE /api/crop-ai/cache/stats
 * 
 * Clears the entire cache. Use with caution.
 * This is useful for debugging or when cache needs to be invalidated.
 */
export async function DELETE() {
  const cache = getCache();
  const previousStats = cache.getStats();
  
  cache.clear();
  
  console.log(`[Cache] Cleared ${previousStats.size} entries`);

  return NextResponse.json({
    success: true,
    message: `Cleared ${previousStats.size} cache entries`,
    previousStats: {
      size: previousStats.size,
      hitRate: `${previousStats.hitRate.toFixed(2)}%`,
    },
  });
}
