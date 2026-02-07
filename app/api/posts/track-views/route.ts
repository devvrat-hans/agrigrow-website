import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import UserFeedPreference from '@/models/UserFeedPreference';

/**
 * POST /api/posts/track-views
 * 
 * Tracks views for multiple posts in a single batch request.
 * This is called when posts become visible in the feed viewport.
 * 
 * Body:
 *   - postIds: Array of post IDs that were viewed
 * 
 * Headers:
 *   - x-user-phone: Authenticated user's phone number
 * 
 * Returns: Success status with updated view counts
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const authPhone = request.headers.get('x-user-phone');
    
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { postIds } = body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'postIds array is required' },
        { status: 400 }
      );
    }

    // Filter valid ObjectIds
    const validPostIds = postIds.filter((id: string) => 
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validPostIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid post IDs provided' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 20;
    const idsToProcess = validPostIds.slice(0, MAX_BATCH_SIZE);
    const userId = user._id;

    // Use bulkWrite for efficient batch updates
    const bulkOps = idsToProcess.map((postId: string) => ({
      updateOne: {
        filter: { 
          _id: new mongoose.Types.ObjectId(postId),
          isDeleted: { $ne: true },
        },
        update: {
          $inc: { viewsCount: 1 },
          $addToSet: { uniqueViewers: userId },
        },
      },
    }));

    const result = await Post.bulkWrite(bulkOps, { ordered: false });

    // Track viewed posts in UserFeedPreference for personalization
    const viewedPostsData = idsToProcess.map((postId: string) => ({
      postId: new mongoose.Types.ObjectId(postId),
      viewDuration: 0,
      timestamp: new Date(),
      scrollPercentage: 0,
      interacted: false,
    }));

    await UserFeedPreference.findOneAndUpdate(
      { userId },
      {
        $push: {
          viewedPosts: {
            $each: viewedPostsData,
            $position: 0,
            $slice: 500, // Keep only last 500 viewed posts
          },
        },
        $set: { lastFeedRefresh: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        processed: idsToProcess.length,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Track views error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track views' },
      { status: 500 }
    );
  }
}
