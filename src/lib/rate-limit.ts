import { NextRequest, NextResponse } from 'next/server';

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

/**
 * Rate limit configuration from environment variables
 */
export interface RateLimitConfig {
  /** Maximum requests per hour (default: 50) */
  requestsPerHour: number;
  /** Maximum requests per day (default: 200) */
  requestsPerDay: number;
  /** Whether rate limiting is enabled */
  enabled: boolean;
  /** Window size in milliseconds for hourly limit */
  hourlyWindowMs: number;
  /** Window size in milliseconds for daily limit */
  dailyWindowMs: number;
}

/**
 * Get rate limit configuration from environment
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    requestsPerHour: parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_HOUR || '50', 10),
    requestsPerDay: parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_DAY || '200', 10),
    enabled: process.env.AI_RATE_LIMIT_ENABLED !== 'false',
    hourlyWindowMs: 60 * 60 * 1000, // 1 hour
    dailyWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  };
}

// ============================================
// RATE LIMIT STORE (In-Memory with MongoDB fallback)
// ============================================

/**
 * Rate limit entry for a user/IP
 */
interface RateLimitEntry {
  /** User identifier (phone or IP) */
  identifier: string;
  /** Hourly request timestamps */
  hourlyRequests: number[];
  /** Daily request timestamps */
  dailyRequests: number[];
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * In-memory store for rate limits
 * Note: This resets on server restart. For production,
 * consider using Redis or MongoDB for persistence.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // Only cleanup every 5 minutes
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  
  const config = getRateLimitConfig();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove if last update was more than 24 hours ago
    if (now - entry.updatedAt > config.dailyWindowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// ============================================
// RATE LIMIT RESULT
// ============================================

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current count of requests in hourly window */
  hourlyCount: number;
  /** Current count of requests in daily window */
  dailyCount: number;
  /** Maximum hourly requests */
  hourlyLimit: number;
  /** Maximum daily requests */
  dailyLimit: number;
  /** Remaining hourly requests */
  hourlyRemaining: number;
  /** Remaining daily requests */
  dailyRemaining: number;
  /** Time until hourly reset (seconds) */
  hourlyResetIn: number;
  /** Time until daily reset (seconds) */
  dailyResetIn: number;
  /** Which limit was exceeded (if any) */
  limitExceeded: 'hourly' | 'daily' | null;
  /** Human-readable error message */
  errorMessage?: string;
}

// ============================================
// IDENTIFIER EXTRACTION
// ============================================

/**
 * Get user identifier from request
 * Prioritizes user phone, falls back to IP
 */
export function getIdentifier(request: NextRequest): {
  identifier: string;
  type: 'user' | 'ip';
} {
  // Try to get user phone from header
  const userPhone = request.headers.get('x-user-phone');
  if (userPhone) {
    const cleanPhone = userPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      return { identifier: `user:${cleanPhone}`, type: 'user' };
    }
  }
  
  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';
  
  return { identifier: `ip:${ip}`, type: 'ip' };
}

// ============================================
// RATE LIMIT CHECK
// ============================================

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const config = getRateLimitConfig();
  const now = Date.now();
  
  // If disabled, allow everything
  if (!config.enabled) {
    return {
      allowed: true,
      hourlyCount: 0,
      dailyCount: 0,
      hourlyLimit: config.requestsPerHour,
      dailyLimit: config.requestsPerDay,
      hourlyRemaining: config.requestsPerHour,
      dailyRemaining: config.requestsPerDay,
      hourlyResetIn: 3600,
      dailyResetIn: 86400,
      limitExceeded: null,
    };
  }
  
  // Cleanup old entries periodically
  cleanupExpiredEntries();
  
  // Get or create entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = {
      identifier,
      hourlyRequests: [],
      dailyRequests: [],
      updatedAt: now,
    };
    rateLimitStore.set(identifier, entry);
  }
  
  // Filter out expired timestamps
  const hourlyWindowStart = now - config.hourlyWindowMs;
  const dailyWindowStart = now - config.dailyWindowMs;
  
  entry.hourlyRequests = entry.hourlyRequests.filter(ts => ts > hourlyWindowStart);
  entry.dailyRequests = entry.dailyRequests.filter(ts => ts > dailyWindowStart);
  
  // Calculate current counts
  const hourlyCount = entry.hourlyRequests.length;
  const dailyCount = entry.dailyRequests.length;
  
  // Check limits
  const hourlyExceeded = hourlyCount >= config.requestsPerHour;
  const dailyExceeded = dailyCount >= config.requestsPerDay;
  
  // Calculate reset times
  const oldestHourly = entry.hourlyRequests[0] || now;
  const oldestDaily = entry.dailyRequests[0] || now;
  const hourlyResetIn = Math.ceil((oldestHourly + config.hourlyWindowMs - now) / 1000);
  const dailyResetIn = Math.ceil((oldestDaily + config.dailyWindowMs - now) / 1000);
  
  // Determine which limit was exceeded
  let limitExceeded: 'hourly' | 'daily' | null = null;
  let errorMessage: string | undefined;
  
  if (hourlyExceeded) {
    limitExceeded = 'hourly';
    const resetMinutes = Math.ceil(hourlyResetIn / 60);
    errorMessage = `You've reached the hourly limit of ${config.requestsPerHour} AI requests. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.`;
  } else if (dailyExceeded) {
    limitExceeded = 'daily';
    const resetHours = Math.ceil(dailyResetIn / 3600);
    errorMessage = `You've reached the daily limit of ${config.requestsPerDay} AI requests. Please try again in ${resetHours} hour${resetHours !== 1 ? 's' : ''}.`;
  }
  
  return {
    allowed: !hourlyExceeded && !dailyExceeded,
    hourlyCount,
    dailyCount,
    hourlyLimit: config.requestsPerHour,
    dailyLimit: config.requestsPerDay,
    hourlyRemaining: Math.max(0, config.requestsPerHour - hourlyCount),
    dailyRemaining: Math.max(0, config.requestsPerDay - dailyCount),
    hourlyResetIn: Math.max(0, hourlyResetIn),
    dailyResetIn: Math.max(0, dailyResetIn),
    limitExceeded,
    errorMessage,
  };
}

/**
 * Record a successful request (increments counters)
 */
export function recordRequest(identifier: string): void {
  const config = getRateLimitConfig();
  if (!config.enabled) return;
  
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);
  
  if (!entry) {
    entry = {
      identifier,
      hourlyRequests: [],
      dailyRequests: [],
      updatedAt: now,
    };
    rateLimitStore.set(identifier, entry);
  }
  
  entry.hourlyRequests.push(now);
  entry.dailyRequests.push(now);
  entry.updatedAt = now;
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit-Hourly', result.hourlyLimit.toString());
  headers.set('X-RateLimit-Limit-Daily', result.dailyLimit.toString());
  headers.set('X-RateLimit-Remaining-Hourly', result.hourlyRemaining.toString());
  headers.set('X-RateLimit-Remaining-Daily', result.dailyRemaining.toString());
  headers.set('X-RateLimit-Reset-Hourly', result.hourlyResetIn.toString());
  headers.set('X-RateLimit-Reset-Daily', result.dailyResetIn.toString());
  
  if (!result.allowed) {
    // Add Retry-After header for rate limited responses
    const retryAfter = result.limitExceeded === 'hourly' 
      ? result.hourlyResetIn 
      : result.dailyResetIn;
    headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = new Headers();
  addRateLimitHeaders(headers, result);
  
  return NextResponse.json(
    {
      success: false,
      error: result.errorMessage || 'Rate limit exceeded. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      limitType: result.limitExceeded,
      retryAfter: result.limitExceeded === 'hourly' 
        ? result.hourlyResetIn 
        : result.dailyResetIn,
    },
    { 
      status: 429,
      headers,
    }
  );
}

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

/**
 * Options for rate limit wrapper
 */
export interface RateLimitWrapperOptions {
  /** Custom identifier (overrides auto-detection) */
  identifier?: string;
  /** Skip rate limiting for this request */
  skip?: boolean;
}

/**
 * Wrap an API handler with rate limiting
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withRateLimit(request, async (req, identifier) => {
 *     // Your handler logic here
 *     return NextResponse.json({ success: true });
 *   });
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest, identifier: string) => Promise<NextResponse>,
  options: RateLimitWrapperOptions = {}
): Promise<NextResponse> {
  // Skip if explicitly disabled
  if (options.skip) {
    return handler(request, 'skipped');
  }
  
  // Get identifier
  const { identifier } = options.identifier 
    ? { identifier: options.identifier }
    : getIdentifier(request);
  
  // Check rate limit
  const result = checkRateLimit(identifier);
  
  // If not allowed, return 429
  if (!result.allowed) {
    console.log(`[Rate Limit] Exceeded for ${identifier}: ${result.limitExceeded}`);
    return createRateLimitResponse(result);
  }
  
  // Execute handler
  try {
    const response = await handler(request, identifier);
    
    // Record successful request
    recordRequest(identifier);
    
    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    
    // Update remaining count after recording
    const updatedResult = checkRateLimit(identifier);
    addRateLimitHeaders(headers, updatedResult);
    
    // Return response with headers
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    // Don't record failed requests
    console.error('[Rate Limit] Handler error:', error);
    throw error;
  }
}

// ============================================
// STATS & MONITORING
// ============================================

/**
 * Get current rate limit stats (for monitoring/admin)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  userEntries: number;
  ipEntries: number;
  config: RateLimitConfig;
} {
  let userEntries = 0;
  let ipEntries = 0;
  
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith('user:')) {
      userEntries++;
    } else {
      ipEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    userEntries,
    ipEntries,
    config: getRateLimitConfig(),
  };
}

/**
 * Clear rate limit for a specific identifier (admin function)
 */
export function clearRateLimit(identifier: string): boolean {
  return rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limits (admin function - use with caution)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

export default {
  checkRateLimit,
  recordRequest,
  withRateLimit,
  getIdentifier,
  getRateLimitStats,
  clearRateLimit,
  createRateLimitResponse,
};
