/**
 * AI Response Caching Layer
 * 
 * Provides caching for AI responses to reduce API costs
 * and improve response times for common queries.
 * 
 * Features:
 * - In-memory LRU cache with configurable size
 * - TTL-based expiration
 * - Query normalization for better cache hits
 * - Semantic similarity matching for similar questions (optional)
 * - Cache statistics for monitoring
 */

// ============================================
// CONFIGURATION
// ============================================

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries to cache */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** TTL for chat responses (shorter since they're conversational) */
  chatTtl: number;
  /** TTL for diagnosis responses (longer since they're analysis-based) */
  diagnosisTtl: number;
  /** TTL for planning responses (longer since they're based on stable data) */
  planningTtl: number;
  /** Whether caching is enabled */
  enabled: boolean;
}

/**
 * Get cache configuration from environment
 */
export function getCacheConfig(): CacheConfig {
  return {
    maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '500', 10),
    defaultTtl: parseInt(process.env.AI_CACHE_TTL || '3600000', 10), // 1 hour default
    chatTtl: parseInt(process.env.AI_CACHE_CHAT_TTL || '1800000', 10), // 30 minutes for chat
    diagnosisTtl: parseInt(process.env.AI_CACHE_DIAGNOSIS_TTL || '86400000', 10), // 24 hours for diagnosis
    planningTtl: parseInt(process.env.AI_CACHE_PLANNING_TTL || '43200000', 10), // 12 hours for planning
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
  };
}

// ============================================
// CACHE TYPES
// ============================================

/**
 * Cache entry types
 */
export type CacheType = 'chat' | 'diagnosis' | 'planning';

/**
 * Cached response entry
 */
interface CacheEntry<T = unknown> {
  /** The cached response data */
  data: T;
  /** When the entry was created */
  createdAt: number;
  /** When the entry expires */
  expiresAt: number;
  /** Number of times this entry has been accessed */
  hitCount: number;
  /** Last time this entry was accessed */
  lastAccessedAt: number;
  /** The type of query this was for */
  type: CacheType;
  /** Hash of the original query for debugging */
  queryHash: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  size: number;
  /** Maximum size */
  maxSize: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Entries by type */
  entriesByType: Record<CacheType, number>;
  /** Average entry age in seconds */
  averageAge: number;
  /** Memory usage estimate in bytes */
  memoryEstimate: number;
}

// ============================================
// LRU CACHE IMPLEMENTATION
// ============================================

/**
 * LRU Cache with TTL support
 */
class AIResponseCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
  };

  constructor() {
    this.cache = new Map();
    this.config = getCacheConfig();
    this.stats = { hits: 0, misses: 0 };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[AICache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size >= this.config.maxSize) {
      // Find the least recently accessed entry
      let oldestKey: string | null = null;
      let oldestAccess = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessedAt < oldestAccess) {
          oldestAccess = entry.lastAccessedAt;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Get TTL based on cache type
   */
  private getTtl(type: CacheType): number {
    switch (type) {
      case 'chat':
        return this.config.chatTtl;
      case 'diagnosis':
        return this.config.diagnosisTtl;
      case 'planning':
        return this.config.planningTtl;
      default:
        return this.config.defaultTtl;
    }
  }

  /**
   * Get an entry from cache
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set an entry in cache
   */
  set<T>(key: string, data: T, type: CacheType): void {
    if (!this.config.enabled) return;

    this.evictIfNeeded();

    const now = Date.now();
    const ttl = this.getTtl(type);

    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
      lastAccessedAt: now,
      type,
      queryHash: key.substring(0, 32),
    });
  }

  /**
   * Check if an entry exists and is valid
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    const entriesByType: Record<CacheType, number> = {
      chat: 0,
      diagnosis: 0,
      planning: 0,
    };
    let totalAge = 0;
    let estimatedSize = 0;

    for (const entry of this.cache.values()) {
      entriesByType[entry.type]++;
      totalAge += now - entry.createdAt;
      // Rough estimate: 1KB base + stringified data length
      estimatedSize += 1024 + JSON.stringify(entry.data).length;
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      entriesByType,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size / 1000 : 0,
      memoryEstimate: estimatedSize,
    };
  }

  /**
   * Get config
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================
// QUERY NORMALIZATION
// ============================================

/**
 * Common words to remove from queries for better matching
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'beneath', 'under', 'above',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'their', 'its', 'his', 'her',
  'and', 'but', 'or', 'not', 'no', 'yes', 'so', 'if', 'then', 'than',
  'please', 'help', 'tell', 'explain', 'how', 'why', 'when', 'where',
  'मुझे', 'बताओ', 'क्या', 'है', 'कैसे', 'करें', 'और', 'या', 'में', 'के', 'की', 'का',
]);

/**
 * Normalize a query for cache key generation
 * Removes stop words, lowercases, and sorts tokens
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .sort()
    .join(' ')
    .trim();
}

/**
 * Generate a cache key
 */
export function generateCacheKey(
  type: CacheType,
  query: string,
  context?: Record<string, unknown>
): string {
  const normalizedQuery = normalizeQuery(query);
  
  // For chat, include minimal context that affects the response
  let contextKey = '';
  if (context) {
    // Only include fields that significantly affect the response
    const relevantContext = {
      season: context.season,
      state: context.state,
      crop: context.crop,
    };
    contextKey = JSON.stringify(relevantContext);
  }
  
  // Create a simple hash
  const fullKey = `${type}:${normalizedQuery}:${contextKey}`;
  return simpleHash(fullKey);
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================
// CACHE INSTANCE
// ============================================

/**
 * Singleton cache instance
 */
let cacheInstance: AIResponseCache | null = null;

/**
 * Get the cache instance
 */
export function getCache(): AIResponseCache {
  if (!cacheInstance) {
    cacheInstance = new AIResponseCache();
  }
  return cacheInstance;
}

// ============================================
// CACHING UTILITIES
// ============================================

/**
 * Check if a query is cacheable
 * Some queries are too specific or personal to cache effectively
 */
export function isCacheable(
  type: CacheType,
  query: string,
  _context?: Record<string, unknown>
): boolean {
  // Very short or very long queries are not good cache candidates
  if (query.length < 10 || query.length > 500) {
    return false;
  }

  // Personal or specific queries shouldn't be cached
  const personalPatterns = [
    /my field/i,
    /my farm/i,
    /my crop/i,
    /yesterday/i,
    /today/i,
    /tomorrow/i,
    /last week/i,
    /this week/i,
    /मेरा खेत/i,
    /मेरी फसल/i,
  ];

  for (const pattern of personalPatterns) {
    if (pattern.test(query)) {
      return false;
    }
  }

  // Diagnosis with images are not cacheable (unique inputs)
  if (type === 'diagnosis') {
    return false; // For now, don't cache diagnosis (image-based)
  }

  return true;
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  type: CacheType,
  query: string,
  context: Record<string, unknown> | undefined,
  fetchFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cache = getCache();
  
  // Check if caching is disabled or query is not cacheable
  if (!cache.getConfig().enabled || !isCacheable(type, query, context)) {
    const data = await fetchFn();
    return { data, cached: false };
  }

  // Generate cache key
  const key = generateCacheKey(type, query, context);

  // Try to get from cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    console.log(`[AICache] Cache HIT for ${type}:${key.substring(0, 8)}`);
    return { data: cached, cached: true };
  }

  console.log(`[AICache] Cache MISS for ${type}:${key.substring(0, 8)}`);

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  cache.set(key, data, type);

  return { data, cached: false };
}

// ============================================
// EXPORTS
// ============================================

export default {
  getCache,
  generateCacheKey,
  normalizeQuery,
  isCacheable,
  withCache,
  getCacheConfig,
};
