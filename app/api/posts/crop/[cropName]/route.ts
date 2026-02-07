import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ cropName: string }>;
}

/**
 * GET /api/posts/crop/[cropName]
 * Returns posts filtered by crop name
 * 
 * Authentication: Optional via x-user-phone header (for personalization and isLiked status)
 * 
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 50)
 *   - sortBy: Sort order - 'newest', 'popular', 'relevant' (default: 'newest')
 *   - cursor: Last post ID for cursor-based pagination
 * 
 * Filtering:
 *   - Case-insensitive regex match on crops array
 *   - Basic personalization for authenticated users
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { cropName } = await params;
    await dbConnect();

    if (!cropName || cropName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Crop name is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sortBy = searchParams.get('sortBy') || 'newest';
    const cursor = searchParams.get('cursor');

    const skip = (page - 1) * limit;

    // Get authenticated user for personalization
    const authPhone = request.headers.get('x-user-phone');
    let currentUser: { _id: mongoose.Types.ObjectId } | null = null;
    let userPreferences: { hiddenPosts?: mongoose.Types.ObjectId[]; mutedUsers?: mongoose.Types.ObjectId[] } | null = null;

    if (authPhone) {
      const cleanPhone = authPhone.replace(/\D/g, '');
      currentUser = await User.findOne({ phone: cleanPhone }).select('_id').lean();

      if (currentUser) {
        // Fetch user preferences for filtering hidden posts and muted users
        userPreferences = await UserFeedPreference.findOne({ userId: currentUser._id })
          .select('hiddenPosts mutedUsers')
          .lean();
      }
    }

    // Decode and normalize crop name for search
    const decodedCropName = decodeURIComponent(cropName).trim().toLowerCase();
    
    // Create case-insensitive regex pattern
    const cropRegex = new RegExp(decodedCropName, 'i');

    // Build query
    const query: Record<string, unknown> = {
      isDeleted: false,
      crops: { $regex: cropRegex }, // Case-insensitive match on crops array
    };

    // Apply personalization filters for authenticated users
    if (currentUser && userPreferences) {
      // Exclude hidden posts
      if (userPreferences.hiddenPosts && userPreferences.hiddenPosts.length > 0) {
        query._id = { $nin: userPreferences.hiddenPosts };
      }
      // Exclude posts from muted users
      if (userPreferences.mutedUsers && userPreferences.mutedUsers.length > 0) {
        query.author = { $nin: userPreferences.mutedUsers };
      }
    }

    // Cursor-based pagination
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      const cursorPost = await Post.findById(cursor).select('createdAt engagementScore').lean();
      if (cursorPost) {
        if (sortBy === 'popular') {
          query.$or = [
            { engagementScore: { $lt: cursorPost.engagementScore } },
            {
              engagementScore: cursorPost.engagementScore,
              _id: { $lt: new mongoose.Types.ObjectId(cursor) },
            },
          ];
        } else {
          query.$or = [
            { createdAt: { $lt: cursorPost.createdAt } },
            {
              createdAt: cursorPost.createdAt,
              _id: { $lt: new mongoose.Types.ObjectId(cursor) },
            },
          ];
        }
      }
    }

    // Determine sort order
    let sortQuery: Record<string, 1 | -1>;
    switch (sortBy) {
      case 'popular':
        sortQuery = { engagementScore: -1, createdAt: -1 };
        break;
      case 'relevant':
        // For relevance, prioritize posts with exact crop matches and higher engagement
        sortQuery = { engagementScore: -1, likesCount: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { createdAt: -1 };
    }

    // Fetch posts
    const posts = await Post.find(query)
      .sort(sortQuery)
      .skip(cursor ? 0 : skip)
      .limit(limit + 1)
      .lean();

    // Check if there are more posts
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

    // Get total count for offset pagination
    const total = cursor ? null : await Post.countDocuments({
      isDeleted: false,
      crops: { $regex: cropRegex },
      ...(currentUser && userPreferences?.hiddenPosts?.length ? { _id: { $nin: userPreferences.hiddenPosts } } : {}),
      ...(currentUser && userPreferences?.mutedUsers?.length ? { author: { $nin: userPreferences.mutedUsers } } : {}),
    });

    // Fetch author details and add isLiked/isSaved status
    const postsWithDetails = await Promise.all(
      postsToReturn.map(async (post) => {
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

    // Build next cursor for pagination
    const nextCursor = hasMore && postsToReturn.length > 0
      ? postsToReturn[postsToReturn.length - 1]._id?.toString()
      : null;

    return NextResponse.json({
      success: true,
      data: postsWithDetails,
      pagination: {
        page: cursor ? null : page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : null,
      },
      hasMore,
      nextCursor,
      meta: {
        cropName: decodedCropName,
        sortBy,
        count: postsWithDetails.length,
        personalized: !!currentUser,
      },
    });

  } catch (error) {
    console.error('Get posts by crop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
