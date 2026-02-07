import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Simple in-memory cache for trending posts
 */
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cache entry is valid
 */
function isCacheValid(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached data
 */
function getCachedData<T>(key: string): T | null {
  if (!isCacheValid(key)) {
    cache.delete(key);
    return null;
  }
  return cache.get(key)?.data as T;
}

/**
 * Set cache data
 */
function setCacheData(key: string, data: unknown): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Generate cache key for trending posts
 */
function getCacheKey(limit: number, postType?: string): string {
  return `trending:${limit}:${postType || 'all'}`;
}

/**
 * GET /api/posts/trending
 * Returns trending posts based on engagement velocity
 * 
 * Query params:
 *   - limit: Number of posts to return (default: 10, max: 50)
 *   - postType: Filter by post type (optional)
 * 
 * Trending calculation:
 *   - Posts from last 7 days
 *   - Engagement velocity = (likes + comments×2 + shares×3) / hours_since_creation
 *   - Higher velocity = more trending
 * 
 * Caching: 5 minute TTL for better performance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const postType = searchParams.get('postType');
    
    // Get authenticated user for isLiked status (optional)
    const authPhone = request.headers.get('x-user-phone');

    // Check cache first (for non-authenticated requests or general trending)
    const cacheKey = getCacheKey(limit, postType || undefined);
    const cachedData = getCachedData<unknown[]>(cacheKey);
    
    if (cachedData && !authPhone) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - (cache.get(cacheKey)?.timestamp || 0)) / 1000),
      });
    }

    await dbConnect();

    // Get current user for personalization
    let currentUser: { _id: mongoose.Types.ObjectId } | null = null;
    if (authPhone) {
      const cleanPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();
    }

    // Calculate date 7 days ago for freshness filter
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Build match stage
    const matchStage: Record<string, unknown> = {
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo },
    };

    if (postType) {
      matchStage.postType = postType;
    }

    // Aggregation pipeline to calculate trending score
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $addFields: {
          // Calculate hours since creation
          hoursSinceCreation: {
            $max: [
              1,
              {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60, // Convert ms to hours
                ],
              },
            ],
          },
          // Calculate engagement velocity
          // Formula: (likes + comments×2 + shares×3) / hours
          engagementVelocity: {
            $divide: [
              {
                $add: [
                  { $ifNull: ['$likesCount', 0] },
                  { $multiply: [{ $ifNull: ['$commentsCount', 0] }, 2] },
                  { $multiply: [{ $ifNull: ['$sharesCount', 0] }, 3] },
                ],
              },
              {
                $max: [
                  1,
                  {
                    $divide: [
                      { $subtract: [new Date(), '$createdAt'] },
                      1000 * 60 * 60,
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      // Sort by engagement velocity (trending score)
      { $sort: { engagementVelocity: -1, createdAt: -1 } },
      // Limit results
      { $limit: limit },
      // Project fields
      {
        $project: {
          _id: 1,
          content: 1,
          postType: 1,
          crops: 1,
          images: 1,
          visibility: 1,
          location: 1,
          author: 1,
          authorPhone: 1,
          likesCount: 1,
          commentsCount: 1,
          sharesCount: 1,
          viewsCount: 1,
          helpfulMarksCount: 1,
          isVerified: 1,
          engagementScore: 1,
          isRepost: 1,
          originalPost: 1,
          likes: 1,
          savedBy: 1,
          createdAt: 1,
          updatedAt: 1,
          engagementVelocity: 1,
          hoursSinceCreation: 1,
        },
      },
    ];

    const trendingPosts = await Post.aggregate(pipeline);

    // Fetch author details and add isLiked/isSaved status
    const postsWithDetails = await Promise.all(
      trendingPosts.map(async (post) => {
        // Get author details
        const author = await User.findById(post.author)
          .select('fullName role profileImage badges experienceLevel')
          .lean();

        // Check if current user liked/saved this post
        let isLiked = false;
        let isSaved = false;
        if (currentUser) {
          isLiked = post.likes?.some((likeId: mongoose.Types.ObjectId) =>
            likeId.toString() === currentUser._id.toString()
          ) || false;
          isSaved = post.savedBy?.some((savedId: mongoose.Types.ObjectId) =>
            savedId.toString() === currentUser._id.toString()
          ) || false;
        }

        // Get original post details if it's a repost
        let originalPostData = null;
        if (post.isRepost && post.originalPost) {
          const originalPost = await Post.findById(post.originalPost)
            .select('content author createdAt')
            .lean();
          
          if (originalPost) {
            const originalAuthor = await User.findById(originalPost.author)
              .select('fullName role profileImage')
              .lean();
            
            originalPostData = {
              _id: originalPost._id.toString(),
              content: originalPost.content,
              createdAt: originalPost.createdAt,
              author: originalAuthor ? {
                _id: originalAuthor._id.toString(),
                fullName: originalAuthor.fullName,
                role: originalAuthor.role,
                profileImage: originalAuthor.profileImage,
              } : null,
            };
          }
        }

        return {
          _id: post._id.toString(),
          content: post.content,
          postType: post.postType,
          type: post.postType, // Legacy support
          crops: post.crops || [],
          tags: post.crops || [], // Legacy support
          images: post.images || [],
          visibility: post.visibility || 'public',
          location: post.location || {},
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
          viewsCount: post.viewsCount || 0,
          helpfulMarksCount: post.helpfulMarksCount || 0,
          isVerified: post.isVerified || false,
          engagementScore: post.engagementScore || 0,
          engagementVelocity: Math.round(post.engagementVelocity * 100) / 100,
          isRepost: post.isRepost || false,
          isLiked,
          isSaved,
          originalPost: originalPostData,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: author ? {
            _id: author._id.toString(),
            fullName: author.fullName,
            role: author.role,
            profileImage: author.profileImage,
            badges: (author as unknown as Record<string, unknown>).badges || [],
            experienceLevel: author.experienceLevel,
          } : {
            _id: '',
            fullName: 'Unknown User',
            role: 'farmer',
            profileImage: null,
            badges: [],
            experienceLevel: 'beginner',
          },
        };
      })
    );

    // Cache the results (without user-specific fields for general cache)
    if (!authPhone) {
      setCacheData(cacheKey, postsWithDetails);
    }

    return NextResponse.json({
      success: true,
      data: postsWithDetails,
      cached: false,
      meta: {
        count: postsWithDetails.length,
        limit,
        postType: postType || 'all',
        freshnessWindow: '7 days',
      },
    });

  } catch (error) {
    console.error('Get trending posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending posts' },
      { status: 500 }
    );
  }
}
