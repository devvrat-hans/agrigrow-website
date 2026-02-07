/**
 * Post Insights API Route
 * 
 * GET /api/posts/[id]/insights - Get insights for a post (author only)
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

/**
 * Insights response structure
 */
interface PostInsightsResponse {
  success: boolean;
  insights?: {
    viewsCount: number;
    uniqueViewersCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    savedCount: number;
    profileVisits: number;
    engagementRate: number; // (interactions / views) * 100
    reach: number; // unique viewers count
    helpfulMarksCount: number;
    createdAt: string;
    daysSinceCreation: number;
  };
  error?: string;
}

/**
 * GET /api/posts/[id]/insights
 * Returns insights only if authenticated user is the post author
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Get authenticated user from headers
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find user by phone
    const user = await User.findOne({ phone: userPhone }).select('_id');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the post
    const post = await Post.findById(id).select(
      'author viewsCount uniqueViewers likesCount commentsCount sharesCount savedBy profileVisits helpfulMarksCount createdAt'
    );

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (post.author.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'You can only view insights for your own posts' },
        { status: 403 }
      );
    }

    // Calculate metrics
    const viewsCount = post.viewsCount || 0;
    const uniqueViewersCount = post.uniqueViewers?.length || 0;
    const likesCount = post.likesCount || 0;
    const commentsCount = post.commentsCount || 0;
    const sharesCount = post.sharesCount || 0;
    const savedCount = post.savedBy?.length || 0;
    const profileVisits = post.profileVisits || 0;
    const helpfulMarksCount = post.helpfulMarksCount || 0;

    // Calculate total interactions (likes + comments + shares + saves)
    const totalInteractions = likesCount + commentsCount + sharesCount + savedCount;

    // Calculate engagement rate as (interactions / views) * 100
    // If no views, engagement rate is 0
    const engagementRate = viewsCount > 0 
      ? Math.round((totalInteractions / viewsCount) * 10000) / 100 
      : 0;

    // Calculate days since creation
    const createdAt = new Date(post.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const insights: PostInsightsResponse['insights'] = {
      viewsCount,
      uniqueViewersCount,
      likesCount,
      commentsCount,
      sharesCount,
      savedCount,
      profileVisits,
      engagementRate,
      reach: uniqueViewersCount,
      helpfulMarksCount,
      createdAt: createdAt.toISOString(),
      daysSinceCreation,
    };

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('Error fetching post insights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post insights' },
      { status: 500 }
    );
  }
}
