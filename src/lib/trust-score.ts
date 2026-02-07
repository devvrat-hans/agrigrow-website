import mongoose from 'mongoose';

/**
 * Trust Score Calculation Utility
 * 
 * Computes a dynamic trust score (0–1000) for a user based on:
 * - Post activity (number of posts, engagement received)
 * - Community engagement (followers, following)
 * - Account maturity (days since registration)
 * - Profile completeness (bio, image, crops, etc.)
 * - Experience level
 * 
 * Tiers:
 *   New       < 200
 *   Active    200–499
 *   Trusted   500–799
 *   Expert    800+
 */

interface TrustScoreInput {
  /** User's MongoDB ObjectId */
  userId: string;
  /** Number of followers */
  followersCount: number;
  /** Number of following */
  followingCount: number;
  /** Account creation date */
  createdAt: Date;
  /** Experience level */
  experienceLevel: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  /** Whether user has a bio */
  hasBio: boolean;
  /** Whether user has a profile image */
  hasProfileImage: boolean;
  /** Number of crops listed */
  cropsCount: number;
  /** Number of interests listed */
  interestsCount: number;
}

interface PostStats {
  totalPosts: number;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  totalSharesReceived: number;
}

// Score weights (total = 1000 max)
const WEIGHTS = {
  POSTS: 200,           // Max 200 points for posting activity
  ENGAGEMENT: 250,      // Max 250 points for engagement received
  COMMUNITY: 150,       // Max 150 points for followers/following
  ACCOUNT_AGE: 150,     // Max 150 points for account age
  PROFILE: 150,         // Max 150 points for profile completeness
  EXPERIENCE: 100,      // Max 100 points for experience level
} as const;

/**
 * Compute post activity score (0–200)
 * Scales logarithmically so early posts matter more
 */
function computePostScore(totalPosts: number): number {
  if (totalPosts <= 0) return 0;
  // log10(1 + posts) normalized: ~1 post = 30, ~10 posts = 100, ~50 posts = 170, ~100+ posts = 200
  const raw = Math.log10(1 + totalPosts) * 100;
  return Math.min(WEIGHTS.POSTS, Math.round(raw));
}

/**
 * Compute engagement score (0–250) based on likes, comments, shares received
 */
function computeEngagementScore(stats: PostStats): number {
  if (stats.totalPosts <= 0) return 0;
  const totalEngagement = stats.totalLikesReceived + (stats.totalCommentsReceived * 2) + (stats.totalSharesReceived * 3);
  // Logarithmic scaling: ~5 engagement = 50, ~50 = 150, ~200+ = 250
  const raw = Math.log10(1 + totalEngagement) * 108;
  return Math.min(WEIGHTS.ENGAGEMENT, Math.round(raw));
}

/**
 * Compute community score (0–150) based on followers/following
 */
function computeCommunityScore(followersCount: number, followingCount: number): number {
  // Followers are weighted more than following
  const followerScore = Math.log10(1 + followersCount) * 60;
  const followingScore = Math.log10(1 + followingCount) * 20;
  return Math.min(WEIGHTS.COMMUNITY, Math.round(followerScore + followingScore));
}

/**
 * Compute account age score (0–150)
 * Rewards longer account tenure
 */
function computeAccountAgeScore(createdAt: Date): number {
  const now = new Date();
  const daysSinceCreation = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  // 1 day = ~15, 7 days = ~50, 30 days = ~90, 90 days = ~120, 365+ days = ~150
  const raw = Math.log10(1 + daysSinceCreation) * 60;
  return Math.min(WEIGHTS.ACCOUNT_AGE, Math.round(raw));
}

/**
 * Compute profile completeness score (0–150)
 */
function computeProfileScore(input: TrustScoreInput): number {
  let score = 0;
  if (input.hasBio) score += 40;
  if (input.hasProfileImage) score += 40;
  if (input.cropsCount > 0) score += 30;
  if (input.interestsCount > 0) score += 20;
  if (input.followersCount > 0 || input.followingCount > 0) score += 20;
  return Math.min(WEIGHTS.PROFILE, score);
}

/**
 * Compute experience level score (0–100)
 */
function computeExperienceScore(level: string): number {
  switch (level) {
    case 'expert': return 100;
    case 'experienced': return 70;
    case 'intermediate': return 45;
    case 'beginner': return 20;
    default: return 10;
  }
}

/**
 * Calculate trust score for a user.
 * Queries the Post collection to get engagement stats, then computes a composite score.
 * 
 * @param input - User data needed for trust score
 * @returns Trust score (0–1000)
 */
export async function calculateUserTrustScore(input: TrustScoreInput): Promise<number> {
  let postStats: PostStats = {
    totalPosts: 0,
    totalLikesReceived: 0,
    totalCommentsReceived: 0,
    totalSharesReceived: 0,
  };

  try {
    // Dynamically import Post model to avoid circular dependency
    const PostModel = mongoose.models.Post;
    if (PostModel) {
      const aggregation = await PostModel.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(input.userId) } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikesReceived: { $sum: { $ifNull: ['$likesCount', 0] } },
            totalCommentsReceived: { $sum: { $ifNull: ['$commentsCount', 0] } },
            totalSharesReceived: { $sum: { $ifNull: ['$sharesCount', 0] } },
          },
        },
      ]);
      if (aggregation.length > 0) {
        postStats = aggregation[0];
      }
    }
  } catch (error) {
    console.error('Error computing post stats for trust score:', error);
    // Continue with zero stats if aggregation fails
  }

  const postScore = computePostScore(postStats.totalPosts);
  const engagementScore = computeEngagementScore(postStats);
  const communityScore = computeCommunityScore(input.followersCount, input.followingCount);
  const accountAgeScore = computeAccountAgeScore(input.createdAt);
  const profileScore = computeProfileScore(input);
  const experienceScore = computeExperienceScore(input.experienceLevel);

  const total = postScore + engagementScore + communityScore + accountAgeScore + profileScore + experienceScore;

  return Math.min(1000, Math.max(0, Math.round(total)));
}
