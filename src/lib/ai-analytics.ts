/**
 * AI Analytics Utility
 * 
 * Provides functions to record and track AI usage analytics.
 * Designed to be non-blocking to avoid impacting request performance.
 */

import dbConnect from './mongodb';
import AIAnalytics from '@/models/AIAnalytics';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnalyticsEvent {
  /** Operation type */
  operationType: 'chat' | 'diagnosis' | 'planning';
  /** User phone number (optional) */
  userPhone?: string;
  /** Whether the request was successful */
  success: boolean;
  /** Response time in milliseconds */
  responseTime: number;
  /** Whether response was from cache */
  cached?: boolean;
  /** Error code if failed */
  errorCode?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Additional metadata */
  metadata?: {
    season?: string;
    state?: string;
    crop?: string;
    model?: string;
    queryLength?: number;
    responseLength?: number;
  };
}

// ============================================
// ANALYTICS RECORDING
// ============================================

/**
 * Record an analytics event asynchronously
 * Non-blocking - fires and forgets
 */
export function recordAnalytics(event: AnalyticsEvent): void {
  // Fire and forget - don't block the request
  setImmediate(async () => {
    try {
      await dbConnect();
      
      await AIAnalytics.create({
        userPhone: event.userPhone,
        operationType: event.operationType,
        success: event.success,
        responseTime: event.responseTime,
        cached: event.cached || false,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        metadata: event.metadata,
      });
    } catch (error) {
      // Log but don't throw - analytics shouldn't crash the app
      console.error('[Analytics] Failed to record event:', error);
    }
  });
}

/**
 * Record a successful AI response
 */
export function recordSuccess(
  operationType: 'chat' | 'diagnosis' | 'planning',
  responseTime: number,
  options?: {
    userPhone?: string;
    cached?: boolean;
    metadata?: AnalyticsEvent['metadata'];
  }
): void {
  recordAnalytics({
    operationType,
    success: true,
    responseTime,
    userPhone: options?.userPhone,
    cached: options?.cached,
    metadata: options?.metadata,
  });
}

/**
 * Record a failed AI request
 */
export function recordError(
  operationType: 'chat' | 'diagnosis' | 'planning',
  responseTime: number,
  errorCode: string,
  errorMessage?: string,
  userPhone?: string
): void {
  recordAnalytics({
    operationType,
    success: false,
    responseTime,
    errorCode,
    errorMessage,
    userPhone,
  });
}

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Rough estimate of tokens (1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================
// PERFORMANCE TRACKING
// ============================================

/**
 * Create a performance tracker for measuring response times
 */
export function createPerformanceTracker() {
  const startTime = Date.now();
  
  return {
    /**
     * Get elapsed time in milliseconds
     */
    getElapsedTime(): number {
      return Date.now() - startTime;
    },
    
    /**
     * Record success and return elapsed time
     */
    recordSuccess(
      operationType: 'chat' | 'diagnosis' | 'planning',
      options?: {
        userPhone?: string;
        cached?: boolean;
        metadata?: AnalyticsEvent['metadata'];
      }
    ): number {
      const elapsed = this.getElapsedTime();
      recordSuccess(operationType, elapsed, options);
      return elapsed;
    },
    
    /**
     * Record error and return elapsed time
     */
    recordError(
      operationType: 'chat' | 'diagnosis' | 'planning',
      errorCode: string,
      errorMessage?: string,
      userPhone?: string
    ): number {
      const elapsed = this.getElapsedTime();
      recordError(operationType, elapsed, errorCode, errorMessage, userPhone);
      return elapsed;
    },
  };
}

export default {
  recordAnalytics,
  recordSuccess,
  recordError,
  estimateTokens,
  createPerformanceTracker,
};
