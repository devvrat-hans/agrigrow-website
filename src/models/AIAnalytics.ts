import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * AI Analytics Model
 * 
 * Tracks AI usage, response times, and errors for monitoring
 * and insights generation.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface IAIAnalytics extends Document {
  /** User identifier (phone number) - optional for anonymous */
  userId?: mongoose.Types.ObjectId;
  /** User phone number for easier querying */
  userPhone?: string;
  /** Type of AI operation */
  operationType: 'chat' | 'diagnosis' | 'planning';
  /** Whether the request was successful */
  success: boolean;
  /** Response time in milliseconds */
  responseTime: number;
  /** Whether response was from cache */
  cached: boolean;
  /** Error code if failed */
  errorCode?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Input token count (estimated) */
  inputTokens?: number;
  /** Output token count (estimated) */
  outputTokens?: number;
  /** Additional metadata */
  metadata?: {
    /** Season context */
    season?: string;
    /** State context */
    state?: string;
    /** Crop context */
    crop?: string;
    /** Model used */
    model?: string;
    /** Query length */
    queryLength?: number;
    /** Response length */
    responseLength?: number;
  };
  /** When the request was made */
  createdAt: Date;
}

// ============================================
// SCHEMA DEFINITION
// ============================================

const AIAnalyticsSchema = new Schema<IAIAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userPhone: {
      type: String,
      index: true,
    },
    operationType: {
      type: String,
      enum: ['chat', 'diagnosis', 'planning'],
      required: true,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    cached: {
      type: Boolean,
      default: false,
    },
    errorCode: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    inputTokens: {
      type: Number,
    },
    outputTokens: {
      type: Number,
    },
    metadata: {
      season: String,
      state: String,
      crop: String,
      model: String,
      queryLength: Number,
      responseLength: Number,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// COMPOUND INDEXES
// ============================================

// For querying by date range and operation type
AIAnalyticsSchema.index({ createdAt: -1, operationType: 1 });

// For user usage reports
AIAnalyticsSchema.index({ userPhone: 1, createdAt: -1 });

// For error monitoring
AIAnalyticsSchema.index({ success: 1, errorCode: 1, createdAt: -1 });

// TTL index - auto-delete after 90 days to manage storage
AIAnalyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ============================================
// STATIC METHODS
// ============================================

interface AggregatedStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  cachedCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

interface DailyStats {
  date: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
}

interface TopErrors {
  errorCode: string;
  count: number;
  percentage: number;
}

interface UserUsage {
  userPhone: string;
  totalRequests: number;
  chatRequests: number;
  diagnosisRequests: number;
  planningRequests: number;
  avgResponseTime: number;
}

interface IAnalyticsModel extends Model<IAIAnalytics> {
  getAggregatedStats(
    operationType?: 'chat' | 'diagnosis' | 'planning',
    startDate?: Date,
    endDate?: Date
  ): Promise<AggregatedStats>;
  
  getDailyStats(
    days?: number,
    operationType?: 'chat' | 'diagnosis' | 'planning'
  ): Promise<DailyStats[]>;
  
  getTopErrors(
    limit?: number,
    startDate?: Date
  ): Promise<TopErrors[]>;
  
  getUserUsage(
    startDate?: Date,
    limit?: number
  ): Promise<UserUsage[]>;
  
  getRealtimeStats(): Promise<{
    last5Minutes: AggregatedStats;
    lastHour: AggregatedStats;
  }>;
}

/**
 * Get aggregated statistics for a time period
 */
AIAnalyticsSchema.statics.getAggregatedStats = async function(
  operationType?: 'chat' | 'diagnosis' | 'planning',
  startDate?: Date,
  endDate?: Date
): Promise<AggregatedStats> {
  const matchStage: Record<string, unknown> = {};
  
  if (operationType) {
    matchStage.operationType = operationType;
  }
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) (matchStage.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (matchStage.createdAt as Record<string, Date>).$lte = endDate;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successCount: { 
          $sum: { $cond: ['$success', 1, 0] } 
        },
        errorCount: { 
          $sum: { $cond: ['$success', 0, 1] } 
        },
        cachedCount: { 
          $sum: { $cond: ['$cached', 1, 0] } 
        },
        avgResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        responseTimes: { $push: '$responseTime' },
      },
    },
  ]);

  if (!results.length) {
    return {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      cachedCount: 0,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }

  const stats = results[0];
  
  // Calculate p95
  const sortedTimes = stats.responseTimes.sort((a: number, b: number) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p95ResponseTime = sortedTimes[p95Index] || stats.maxResponseTime;

  return {
    totalRequests: stats.totalRequests,
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    cachedCount: stats.cachedCount,
    avgResponseTime: Math.round(stats.avgResponseTime),
    minResponseTime: stats.minResponseTime,
    maxResponseTime: stats.maxResponseTime,
    p95ResponseTime: Math.round(p95ResponseTime),
    errorRate: stats.totalRequests > 0 
      ? (stats.errorCount / stats.totalRequests) * 100 
      : 0,
    cacheHitRate: stats.totalRequests > 0 
      ? (stats.cachedCount / stats.totalRequests) * 100 
      : 0,
  };
};

/**
 * Get daily statistics for a number of days
 */
AIAnalyticsSchema.statics.getDailyStats = async function(
  days = 7,
  operationType?: 'chat' | 'diagnosis' | 'planning'
): Promise<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const matchStage: Record<string, unknown> = {
    createdAt: { $gte: startDate },
  };
  
  if (operationType) {
    matchStage.operationType = operationType;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalRequests: { $sum: 1 },
        successCount: { 
          $sum: { $cond: ['$success', 1, 0] } 
        },
        errorCount: { 
          $sum: { $cond: ['$success', 0, 1] } 
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map(r => ({
    date: r._id,
    totalRequests: r.totalRequests,
    successCount: r.successCount,
    errorCount: r.errorCount,
    avgResponseTime: Math.round(r.avgResponseTime),
  }));
};

/**
 * Get top errors
 */
AIAnalyticsSchema.statics.getTopErrors = async function(
  limit = 10,
  startDate?: Date
): Promise<TopErrors[]> {
  const matchStage: Record<string, unknown> = {
    success: false,
    errorCode: { $exists: true, $ne: null },
  };
  
  if (startDate) {
    matchStage.createdAt = { $gte: startDate };
  }

  const totalErrors = await this.countDocuments(matchStage);

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$errorCode',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return results.map(r => ({
    errorCode: r._id,
    count: r.count,
    percentage: totalErrors > 0 ? (r.count / totalErrors) * 100 : 0,
  }));
};

/**
 * Get user usage statistics
 */
AIAnalyticsSchema.statics.getUserUsage = async function(
  startDate?: Date,
  limit = 20
): Promise<UserUsage[]> {
  const matchStage: Record<string, unknown> = {
    userPhone: { $exists: true, $ne: null },
  };
  
  if (startDate) {
    matchStage.createdAt = { $gte: startDate };
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$userPhone',
        totalRequests: { $sum: 1 },
        chatRequests: {
          $sum: { $cond: [{ $eq: ['$operationType', 'chat'] }, 1, 0] },
        },
        diagnosisRequests: {
          $sum: { $cond: [{ $eq: ['$operationType', 'diagnosis'] }, 1, 0] },
        },
        planningRequests: {
          $sum: { $cond: [{ $eq: ['$operationType', 'planning'] }, 1, 0] },
        },
        avgResponseTime: { $avg: '$responseTime' },
      },
    },
    { $sort: { totalRequests: -1 } },
    { $limit: limit },
  ]);

  return results.map(r => ({
    userPhone: r._id,
    totalRequests: r.totalRequests,
    chatRequests: r.chatRequests,
    diagnosisRequests: r.diagnosisRequests,
    planningRequests: r.planningRequests,
    avgResponseTime: Math.round(r.avgResponseTime),
  }));
};

/**
 * Get realtime statistics
 */
AIAnalyticsSchema.statics.getRealtimeStats = async function(): Promise<{
  last5Minutes: AggregatedStats;
  lastHour: AggregatedStats;
}> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Cast this to access static methods
  const model = this as IAnalyticsModel;

  const [last5Minutes, lastHour] = await Promise.all([
    model.getAggregatedStats(undefined, fiveMinutesAgo, now),
    model.getAggregatedStats(undefined, oneHourAgo, now),
  ]);

  return { last5Minutes, lastHour };
};

// ============================================
// MODEL EXPORT
// ============================================

const AIAnalytics = (mongoose.models.AIAnalytics as IAnalyticsModel) || 
  mongoose.model<IAIAnalytics, IAnalyticsModel>('AIAnalytics', AIAnalyticsSchema);

export default AIAnalytics;
