/**
 * Feed Algorithm Library
 * 
 * Implements the personalized recommendation algorithm for the Agrigrow home feed.
 * 
 * The feed score formula is:
 * FeedScore = (RelevanceScore × 0.4) + (EngagementScore × 0.3) + (RecencyScore × 0.2) + (TrustScore × 0.1)
 * 
 * This balances content relevance to the user, post engagement, freshness, and trust indicators.
 */

import mongoose from 'mongoose';
import type { IPost } from '@/models/Post';
import type { IUser } from '@/models/User';

/**
 * Weight constants for the feed score formula
 */
const WEIGHTS = {
  RELEVANCE: 0.4,
  ENGAGEMENT: 0.3,
  RECENCY: 0.2,
  TRUST: 0.1,
};

/**
 * Relevance score sub-weights
 */
const RELEVANCE_WEIGHTS = {
  CROP_MATCH: 0.4,      // 40% - Most important for farmers
  LOCATION_MATCH: 0.3,  // 30% - Regional relevance
  ROLE_MATCH: 0.15,     // 15% - Same user type (farmer/student/business)
  EXPERIENCE_MATCH: 0.15, // 15% - Experience level alignment
};

/**
 * Engagement score multipliers
 */
const ENGAGEMENT_MULTIPLIERS = {
  LIKE: 1,
  COMMENT: 3,
  SHARE: 5,
  HELPFUL_MARK: 10,
};

/**
 * Time decay constants (in hours)
 */
const TIME_BRACKETS = {
  VERY_FRESH: 1,       // Under 1 hour
  FRESH: 6,            // 1-6 hours
  RECENT: 24,          // 6-24 hours
  MODERATELY_OLD: 72,  // 1-3 days
  OLD: 168,            // 3-7 days
};

/**
 * Recency scores for each time bracket
 */
const RECENCY_SCORES = {
  VERY_FRESH: 1.0,
  FRESH: 0.9,
  RECENT: 0.7,
  MODERATELY_OLD: 0.5,
  OLD: 0.3,
  VERY_OLD: 0.1,
};

/**
 * Trust score bonuses
 */
const TRUST_BONUSES = {
  VERIFIED_POST: 0.3,
  PER_BADGE: 0.1,
  HIGH_HELPFUL_RATIO: 0.2,
  MAX_BADGE_BONUS: 0.5, // Cap badge bonus at 0.5
};

/**
 * Helpful ratio threshold (comments marked helpful / total comments)
 */
const HIGH_HELPFUL_RATIO_THRESHOLD = 0.3;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate crop match score between post and user
 * Returns a score from 0 to 1 based on how many of the post's crops
 * match the user's selected crops
 */
function calculateCropMatchScore(postCrops: string[], userCrops: string[]): number {
  if (!postCrops || postCrops.length === 0) return 0.3; // Neutral score for posts without crops
  if (!userCrops || userCrops.length === 0) return 0.5; // Slightly higher neutral for users without crop preferences
  
  const postCropsLower = postCrops.map(c => c.toLowerCase());
  const userCropsLower = userCrops.map(c => c.toLowerCase());
  
  // Count matching crops
  const matchCount = postCropsLower.filter(crop => 
    userCropsLower.includes(crop)
  ).length;
  
  // Score based on match percentage of post crops
  const matchRatio = matchCount / postCrops.length;
  
  // Bonus for multiple matches
  const multiMatchBonus = matchCount > 1 ? 0.1 * Math.min(matchCount - 1, 3) : 0;
  
  return Math.min(1, matchRatio + multiMatchBonus);
}

/**
 * Calculate location match score
 * Same state = 0.6, Same district = 1.0, Different = 0.2
 */
function calculateLocationMatchScore(
  postLocation: { state?: string; district?: string } | undefined,
  userState?: string,
  userDistrict?: string
): number {
  if (!postLocation) return 0.5; // Neutral for posts without location
  if (!userState) return 0.5; // Neutral for users without location
  
  const postState = postLocation.state?.toLowerCase();
  const postDistrict = postLocation.district?.toLowerCase();
  const userStateLower = userState.toLowerCase();
  const userDistrictLower = userDistrict?.toLowerCase();
  
  // Exact district match (implies state match too)
  if (postDistrict && userDistrictLower && postDistrict === userDistrictLower) {
    return 1.0;
  }
  
  // State match only
  if (postState && postState === userStateLower) {
    return 0.7;
  }
  
  // No location match
  return 0.2;
}

/**
 * Calculate role match score
 * Same role = 1.0, Related roles = 0.6, Different = 0.3
 */
function calculateRoleMatchScore(
  postAuthorRole: string | undefined,
  userRole: string
): number {
  if (!postAuthorRole) return 0.5;
  
  if (postAuthorRole === userRole) {
    return 1.0;
  }
  
  // Related roles (farmers and students both interested in agriculture)
  const agricultureRoles = ['farmer', 'student'];
  if (agricultureRoles.includes(postAuthorRole) && agricultureRoles.includes(userRole)) {
    return 0.7;
  }
  
  // Business role relates to both but less directly
  if (postAuthorRole === 'business' || userRole === 'business') {
    return 0.5;
  }
  
  return 0.3;
}

/**
 * Calculate experience level match score
 * Users prefer content from similar or higher experience levels
 */
function calculateExperienceMatchScore(
  postAuthorExperience: string | undefined,
  userExperience: string
): number {
  if (!postAuthorExperience) return 0.5;
  
  const experienceLevels = ['beginner', 'intermediate', 'experienced', 'expert'];
  const postLevel = experienceLevels.indexOf(postAuthorExperience);
  const userLevel = experienceLevels.indexOf(userExperience);
  
  if (postLevel === -1 || userLevel === -1) return 0.5;
  
  // Same level = best match
  if (postLevel === userLevel) return 1.0;
  
  // Content from more experienced users is valuable
  if (postLevel > userLevel) {
    const levelDiff = postLevel - userLevel;
    // 1 level higher = 0.9, 2 levels = 0.8, 3 levels = 0.7
    return Math.max(0.6, 1.0 - (levelDiff * 0.1));
  }
  
  // Content from less experienced users
  const levelDiff = userLevel - postLevel;
  // 1 level lower = 0.6, 2 levels = 0.4, 3 levels = 0.3
  return Math.max(0.3, 0.7 - (levelDiff * 0.15));
}

// ============================================
// MAIN SCORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate the relevance score component
 * Based on: crop match (40%), location match (30%), role match (15%), experience match (15%)
 */
export function calculateRelevanceScore(
  post: IPost,
  user: IUser,
  postAuthor?: Partial<IUser>
): number {
  const cropScore = calculateCropMatchScore(post.crops || [], user.crops || []);
  const locationScore = calculateLocationMatchScore(
    post.location,
    user.state,
    user.district
  );
  
  // Use populated author data if available, otherwise use basic defaults
  const authorRole = postAuthor?.role || user.role;
  const authorExperience = postAuthor?.experienceLevel || 'intermediate';
  
  const roleScore = calculateRoleMatchScore(authorRole, user.role);
  const experienceScore = calculateExperienceMatchScore(authorExperience, user.experienceLevel);
  
  return (
    cropScore * RELEVANCE_WEIGHTS.CROP_MATCH +
    locationScore * RELEVANCE_WEIGHTS.LOCATION_MATCH +
    roleScore * RELEVANCE_WEIGHTS.ROLE_MATCH +
    experienceScore * RELEVANCE_WEIGHTS.EXPERIENCE_MATCH
  );
}

/**
 * Calculate the engagement score component
 * Formula: (likes×1 + comments×3 + shares×5 + helpfulMarks×10) / timeDecayFactor
 */
export function calculateEngagementScore(post: IPost): number {
  const rawEngagement = 
    (post.likesCount || 0) * ENGAGEMENT_MULTIPLIERS.LIKE +
    (post.commentsCount || 0) * ENGAGEMENT_MULTIPLIERS.COMMENT +
    (post.sharesCount || 0) * ENGAGEMENT_MULTIPLIERS.SHARE +
    (post.helpfulMarksCount || 0) * ENGAGEMENT_MULTIPLIERS.HELPFUL_MARK;
  
  // Time decay factor: older posts need more engagement to score equally
  const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  const timeDecayFactor = Math.log10(hoursOld + 2) + 1; // +2 to avoid log(0), +1 to start at ~1.3
  
  // Normalize to 0-1 range with logarithmic scaling
  // A post with 100 raw engagement after time decay is considered "perfect"
  const normalizedEngagement = Math.min(1, Math.log10((rawEngagement / timeDecayFactor) + 1) / 2);
  
  return normalizedEngagement;
}

/**
 * Calculate the recency score component
 * Returns score based on how old the post is
 */
export function calculateRecencyScore(post: IPost): number {
  const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursOld < TIME_BRACKETS.VERY_FRESH) {
    return RECENCY_SCORES.VERY_FRESH;
  } else if (hoursOld < TIME_BRACKETS.FRESH) {
    return RECENCY_SCORES.FRESH;
  } else if (hoursOld < TIME_BRACKETS.RECENT) {
    return RECENCY_SCORES.RECENT;
  } else if (hoursOld < TIME_BRACKETS.MODERATELY_OLD) {
    return RECENCY_SCORES.MODERATELY_OLD;
  } else if (hoursOld < TIME_BRACKETS.OLD) {
    return RECENCY_SCORES.OLD;
  }
  
  return RECENCY_SCORES.VERY_OLD;
}

/**
 * Calculate the trust score component
 * Based on: verified status (+0.3), author badges (+0.1 each), helpful ratio (+0.2)
 */
export function calculateTrustScore(
  post: IPost,
  authorBadges?: string[]
): number {
  let trustScore = 0;
  
  // Verified post bonus
  if (post.isVerified) {
    trustScore += TRUST_BONUSES.VERIFIED_POST;
  }
  
  // Author badges bonus (capped)
  if (authorBadges && authorBadges.length > 0) {
    const badgeBonus = Math.min(
      authorBadges.length * TRUST_BONUSES.PER_BADGE,
      TRUST_BONUSES.MAX_BADGE_BONUS
    );
    trustScore += badgeBonus;
  }
  
  // High helpful ratio bonus
  if (post.commentsCount > 0 && post.helpfulMarksCount > 0) {
    const helpfulRatio = post.helpfulMarksCount / post.commentsCount;
    if (helpfulRatio >= HIGH_HELPFUL_RATIO_THRESHOLD) {
      trustScore += TRUST_BONUSES.HIGH_HELPFUL_RATIO;
    }
  }
  
  // Normalize to 0-1 range
  return Math.min(1, trustScore);
}

/**
 * Calculate the combined feed score for a post
 * 
 * FeedScore = (RelevanceScore × 0.4) + (EngagementScore × 0.3) + (RecencyScore × 0.2) + (TrustScore × 0.1)
 */
export function calculateFeedScore(
  post: IPost,
  user: IUser,
  postAuthor?: Partial<IUser>,
  authorBadges?: string[]
): number {
  const relevanceScore = calculateRelevanceScore(post, user, postAuthor);
  const engagementScore = calculateEngagementScore(post);
  const recencyScore = calculateRecencyScore(post);
  const trustScore = calculateTrustScore(post, authorBadges);
  
  const combinedScore = 
    relevanceScore * WEIGHTS.RELEVANCE +
    engagementScore * WEIGHTS.ENGAGEMENT +
    recencyScore * WEIGHTS.RECENCY +
    trustScore * WEIGHTS.TRUST;
  
  return combinedScore;
}

/**
 * Score breakdown for debugging/analytics
 */
export interface FeedScoreBreakdown {
  total: number;
  relevance: number;
  engagement: number;
  recency: number;
  trust: number;
  weighted: {
    relevance: number;
    engagement: number;
    recency: number;
    trust: number;
  };
}

/**
 * Calculate feed score with detailed breakdown
 * Useful for debugging and understanding why a post ranked where it did
 */
export function calculateFeedScoreWithBreakdown(
  post: IPost,
  user: IUser,
  postAuthor?: Partial<IUser>,
  authorBadges?: string[]
): FeedScoreBreakdown {
  const relevanceScore = calculateRelevanceScore(post, user, postAuthor);
  const engagementScore = calculateEngagementScore(post);
  const recencyScore = calculateRecencyScore(post);
  const trustScore = calculateTrustScore(post, authorBadges);
  
  return {
    total: 
      relevanceScore * WEIGHTS.RELEVANCE +
      engagementScore * WEIGHTS.ENGAGEMENT +
      recencyScore * WEIGHTS.RECENCY +
      trustScore * WEIGHTS.TRUST,
    relevance: relevanceScore,
    engagement: engagementScore,
    recency: recencyScore,
    trust: trustScore,
    weighted: {
      relevance: relevanceScore * WEIGHTS.RELEVANCE,
      engagement: engagementScore * WEIGHTS.ENGAGEMENT,
      recency: recencyScore * WEIGHTS.RECENCY,
      trust: trustScore * WEIGHTS.TRUST,
    },
  };
}

// ============================================
// PERSONALIZED FEED FUNCTION
// ============================================

/**
 * Post with author populated for feed display
 */
export interface PopulatedPost extends Omit<IPost, 'author'> {
  author: {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    profileImage?: string;
    role: string;
    badges?: string[];
    experienceLevel?: string;
  };
  feedScore?: number;
}

/**
 * Options for getPersonalizedFeed
 */
export interface GetPersonalizedFeedOptions {
  userId: mongoose.Types.ObjectId;
  page?: number;
  limit?: number;
  cursor?: string; // Last post ID for cursor-based pagination
  category?: string; // Optional post type filter
  crop?: string; // Optional crop filter
  excludePostIds?: mongoose.Types.ObjectId[]; // Posts to exclude (already seen)
}

/**
 * Result from getPersonalizedFeed
 */
export interface PersonalizedFeedResult {
  posts: PopulatedPost[];
  hasMore: boolean;
  nextCursor: string | null;
  totalScored: number;
}

/**
 * Get personalized feed for a user
 * 
 * This function is designed to be used with MongoDB aggregation pipeline.
 * It returns the configuration needed for the pipeline rather than executing queries directly,
 * keeping the database operations in the API layer.
 * 
 * @param user The user requesting the feed
 * @param options Feed options (pagination, filters)
 * @returns MongoDB aggregation pipeline stages
 */
export function buildFeedAggregationPipeline(
  user: IUser,
  options: {
    cursor?: string;
    limit: number;
    category?: string;
    crop?: string;
    hiddenPosts?: mongoose.Types.ObjectId[];
    mutedUsers?: mongoose.Types.ObjectId[];
    excludePostIds?: mongoose.Types.ObjectId[];
  }
): mongoose.PipelineStage[] {
  const { cursor, limit, category, crop, hiddenPosts = [], mutedUsers = [], excludePostIds = [] } = options;
  
  const pipeline: mongoose.PipelineStage[] = [];
  
  // Stage 1: Match criteria
  const matchStage: Record<string, unknown> = {
    isDeleted: { $ne: true },
    visibility: 'public', // Only show public posts in feed
  };
  
  // Exclude hidden posts
  if (hiddenPosts.length > 0) {
    matchStage._id = { $nin: hiddenPosts };
  }
  
  // Exclude muted users
  if (mutedUsers.length > 0) {
    matchStage.author = { $nin: mutedUsers };
  }
  
  // Exclude already seen posts
  if (excludePostIds && excludePostIds.length > 0) {
    if (matchStage._id) {
      (matchStage._id as Record<string, unknown>).$nin = [
        ...((matchStage._id as Record<string, unknown[]>).$nin || []),
        ...excludePostIds,
      ];
    } else {
      matchStage._id = { $nin: excludePostIds };
    }
  }
  
  // Filter by category (postType)
  if (category) {
    matchStage.postType = category;
  }
  
  // Filter by crop
  if (crop) {
    matchStage.crops = { $in: [crop.toLowerCase()] };
  }
  
  // Cursor-based pagination
  if (cursor) {
    matchStage._id = {
      ...(matchStage._id as Record<string, unknown> || {}),
      $lt: new mongoose.Types.ObjectId(cursor),
    };
  }
  
  pipeline.push({ $match: matchStage });
  
  // Stage 2: Lookup author details
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'authorData',
      pipeline: [
        {
          $project: {
            _id: 1,
            fullName: 1,
            profileImage: 1,
            role: 1,
            badges: 1,
            experienceLevel: 1,
            state: 1,
            district: 1,
          },
        },
      ],
    },
  });
  
  // Stage 3: Unwind author (convert array to single object)
  pipeline.push({
    $unwind: {
      path: '$authorData',
      preserveNullAndEmptyArrays: true,
    },
  });
  
  // Stage 4: Add computed fields for scoring
  pipeline.push({
    $addFields: {
      // Recency score calculation
      ageInHours: {
        $divide: [
          { $subtract: [new Date(), '$createdAt'] },
          3600000, // milliseconds in an hour
        ],
      },
      
      // Raw engagement for sorting
      rawEngagement: {
        $add: [
          { $multiply: [{ $ifNull: ['$likesCount', 0] }, ENGAGEMENT_MULTIPLIERS.LIKE] },
          { $multiply: [{ $ifNull: ['$commentsCount', 0] }, ENGAGEMENT_MULTIPLIERS.COMMENT] },
          { $multiply: [{ $ifNull: ['$sharesCount', 0] }, ENGAGEMENT_MULTIPLIERS.SHARE] },
          { $multiply: [{ $ifNull: ['$helpfulMarksCount', 0] }, ENGAGEMENT_MULTIPLIERS.HELPFUL_MARK] },
        ],
      },
      
      // Crop match score (simplified for aggregation)
      cropMatchScore: user.crops && user.crops.length > 0 ? {
        $cond: {
          if: { $gt: [{ $size: { $ifNull: ['$crops', []] } }, 0] },
          then: {
            $divide: [
              { $size: { $setIntersection: [
                { $map: { input: { $ifNull: ['$crops', []] }, as: 'c', in: { $toLower: '$$c' } } },
                user.crops.map(c => c.toLowerCase()),
              ] } },
              { $size: { $ifNull: ['$crops', []] } },
            ],
          },
          else: 0.3,
        },
      } : 0.5,
      
      // Location match score
      locationMatchScore: user.state ? {
        $cond: {
          if: {
            $and: [
              { $ifNull: ['$location.district', false] },
              { $eq: [{ $toLower: '$location.district' }, user.district?.toLowerCase() || ''] },
            ],
          },
          then: 1.0,
          else: {
            $cond: {
              if: { $eq: [{ $toLower: { $ifNull: ['$location.state', ''] } }, user.state.toLowerCase()] },
              then: 0.7,
              else: 0.2,
            },
          },
        },
      } : 0.5,
      
      // Role match score
      roleMatchScore: {
        $cond: {
          if: { $eq: ['$authorData.role', user.role] },
          then: 1.0,
          else: {
            $cond: {
              if: {
                $and: [
                  { $in: ['$authorData.role', ['farmer', 'student']] },
                  { $in: [user.role, ['farmer', 'student']] },
                ],
              },
              then: 0.7,
              else: 0.3,
            },
          },
        },
      },
    },
  });
  
  // Stage 5: Calculate combined feed score
  pipeline.push({
    $addFields: {
      // Recency score
      recencyScore: {
        $switch: {
          branches: [
            { case: { $lt: ['$ageInHours', TIME_BRACKETS.VERY_FRESH] }, then: RECENCY_SCORES.VERY_FRESH },
            { case: { $lt: ['$ageInHours', TIME_BRACKETS.FRESH] }, then: RECENCY_SCORES.FRESH },
            { case: { $lt: ['$ageInHours', TIME_BRACKETS.RECENT] }, then: RECENCY_SCORES.RECENT },
            { case: { $lt: ['$ageInHours', TIME_BRACKETS.MODERATELY_OLD] }, then: RECENCY_SCORES.MODERATELY_OLD },
            { case: { $lt: ['$ageInHours', TIME_BRACKETS.OLD] }, then: RECENCY_SCORES.OLD },
          ],
          default: RECENCY_SCORES.VERY_OLD,
        },
      },
      
      // Engagement score (simplified normalization)
      engagementScoreCalc: {
        $min: [
          1,
          {
            $divide: [
              '$rawEngagement',
              { $add: [{ $multiply: ['$ageInHours', 2] }, 50] }, // Time-adjusted normalization
            ],
          },
        ],
      },
      
      // Trust score
      trustScore: {
        $add: [
          { $cond: { if: '$isVerified', then: TRUST_BONUSES.VERIFIED_POST, else: 0 } },
          { $min: [
            TRUST_BONUSES.MAX_BADGE_BONUS,
            { $multiply: [{ $size: { $ifNull: ['$authorData.badges', []] } }, TRUST_BONUSES.PER_BADGE] },
          ] },
        ],
      },
      
      // Relevance score
      relevanceScore: {
        $add: [
          { $multiply: ['$cropMatchScore', RELEVANCE_WEIGHTS.CROP_MATCH] },
          { $multiply: ['$locationMatchScore', RELEVANCE_WEIGHTS.LOCATION_MATCH] },
          { $multiply: ['$roleMatchScore', RELEVANCE_WEIGHTS.ROLE_MATCH] },
          { $multiply: [0.5, RELEVANCE_WEIGHTS.EXPERIENCE_MATCH] }, // Default experience score
        ],
      },
    },
  });
  
  // Stage 6: Calculate final feed score
  pipeline.push({
    $addFields: {
      feedScore: {
        $add: [
          { $multiply: ['$relevanceScore', WEIGHTS.RELEVANCE] },
          { $multiply: ['$engagementScoreCalc', WEIGHTS.ENGAGEMENT] },
          { $multiply: ['$recencyScore', WEIGHTS.RECENCY] },
          { $multiply: ['$trustScore', WEIGHTS.TRUST] },
        ],
      },
    },
  });
  
  // Stage 7: Sort by feed score (descending), then by createdAt for tie-breaking
  pipeline.push({
    $sort: {
      feedScore: -1,
      createdAt: -1,
    },
  });
  
  // Stage 8: Limit results (fetch one extra to check hasMore)
  pipeline.push({ $limit: limit + 1 });
  
  // Stage 9: Project final shape
  pipeline.push({
    $project: {
      _id: 1,
      content: 1,
      images: 1,
      postType: 1,
      crops: 1,
      location: 1,
      likes: 1,
      likesCount: 1,
      commentsCount: 1,
      sharesCount: 1,
      visibility: 1,
      isVerified: 1,
      engagementScore: 1,
      viewsCount: 1,
      helpfulMarksCount: 1,
      isRepost: 1,
      originalPost: 1,
      createdAt: 1,
      updatedAt: 1,
      feedScore: 1,
      author: {
        _id: '$authorData._id',
        fullName: '$authorData.fullName',
        profileImage: '$authorData.profileImage',
        role: '$authorData.role',
        badges: '$authorData.badges',
        experienceLevel: '$authorData.experienceLevel',
      },
    },
  });
  
  return pipeline;
}

/**
 * Sort posts by feed score on the client side
 * Useful when posts are already fetched and need re-ranking
 */
export function sortPostsByFeedScore(
  posts: PopulatedPost[],
  user: IUser
): PopulatedPost[] {
  return posts
    .map(post => ({
      ...post,
      feedScore: calculateFeedScore(
        post as unknown as IPost,
        user,
        post.author as unknown as Partial<IUser>,
        post.author?.badges
      ),
    }))
    .sort((a, b) => (b.feedScore || 0) - (a.feedScore || 0));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get posts that might be relevant to a user based on their preferences
 * Useful for "suggested posts" or "you might like" sections
 */
export function getRelevanceFilters(user: IUser): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    isDeleted: { $ne: true },
    visibility: 'public',
  };
  
  // Prioritize posts about user's crops
  if (user.crops && user.crops.length > 0) {
    filters.crops = { $in: user.crops.map(c => c.toLowerCase()) };
  }
  
  // Prioritize posts from user's location
  if (user.state) {
    filters['location.state'] = user.state;
  }
  
  return filters;
}

/**
 * Calculate trending score for posts (for "Trending" tab)
 * Uses engagement velocity (engagement per hour) rather than personalization
 */
export function calculateTrendingScore(post: IPost): number {
  const hoursOld = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
  
  const rawEngagement = 
    (post.likesCount || 0) * 1 +
    (post.commentsCount || 0) * 3 +
    (post.sharesCount || 0) * 5;
  
  // Engagement velocity: engagement per hour
  const velocity = rawEngagement / hoursOld;
  
  // Boost for very recent high-engagement posts
  const recencyBoost = hoursOld < 6 ? 1.5 : hoursOld < 24 ? 1.2 : 1.0;
  
  return velocity * recencyBoost;
}

/**
 * Build aggregation pipeline for trending posts
 */
export function buildTrendingAggregationPipeline(
  limit: number,
  hours: number = 72 // Look at posts from last 72 hours
): mongoose.PipelineStage[] {
  const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return [
    {
      $match: {
        isDeleted: { $ne: true },
        visibility: 'public',
        createdAt: { $gte: sinceDate },
      },
    },
    {
      $addFields: {
        ageInHours: {
          $max: [
            1,
            { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3600000] },
          ],
        },
        rawEngagement: {
          $add: [
            { $multiply: [{ $ifNull: ['$likesCount', 0] }, 1] },
            { $multiply: [{ $ifNull: ['$commentsCount', 0] }, 3] },
            { $multiply: [{ $ifNull: ['$sharesCount', 0] }, 5] },
          ],
        },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $multiply: [
            { $divide: ['$rawEngagement', '$ageInHours'] },
            { $cond: { if: { $lt: ['$ageInHours', 6] }, then: 1.5, else: { $cond: { if: { $lt: ['$ageInHours', 24] }, then: 1.2, else: 1.0 } } } },
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorData',
        pipeline: [
          { $project: { _id: 1, fullName: 1, profileImage: 1, role: 1, badges: 1 } },
        ],
      },
    },
    { $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
    { $sort: { trendingScore: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        content: 1,
        images: 1,
        postType: 1,
        crops: 1,
        location: 1,
        likesCount: 1,
        commentsCount: 1,
        sharesCount: 1,
        createdAt: 1,
        trendingScore: 1,
        author: {
          _id: '$authorData._id',
          fullName: '$authorData.fullName',
          profileImage: '$authorData.profileImage',
          role: '$authorData.role',
          badges: '$authorData.badges',
        },
      },
    },
  ];
}
