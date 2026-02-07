import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import UserFeedPreference from '@/models/UserFeedPreference';
import mongoose from 'mongoose';

/**
 * POST /api/feed/preferences/hide
 * Quick hide action - adds postId to user's hiddenPosts array
 * 
 * Authentication: Required via x-user-phone header
 * 
 * Body:
 *   - postId: ID of the post to hide (required)
 * 
 * Returns: Success status with updated hidden posts count
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { postId } = body;

    // Validate postId
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Verify post exists
    const postExists = await Post.exists({ _id: postId, isDeleted: false });
    if (!postExists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    const postObjectId = new mongoose.Types.ObjectId(postId);

    // Add post to hidden posts using $addToSet to prevent duplicates
    const updatedPreferences = await UserFeedPreference.findOneAndUpdate(
      { userId: user._id },
      {
        $addToSet: { hiddenPosts: postObjectId },
        $setOnInsert: {
          userId: user._id,
          viewedPosts: [],
          likedTopics: new Map(),
          likedCrops: new Map(),
          mutedUsers: [],
          preferredAuthors: new Map(),
          lastFeedRefresh: new Date(),
          settings: {
            showReposts: true,
            prioritizeFollowing: true,
            contentTypes: ['question', 'update', 'tip', 'problem', 'success_story'],
          },
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).select('hiddenPosts').lean();

    if (!updatedPreferences) {
      return NextResponse.json(
        { success: false, error: 'Failed to hide post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Post hidden successfully',
      data: {
        postId,
        hiddenPostsCount: (updatedPreferences.hiddenPosts || []).length,
      },
    });

  } catch (error) {
    console.error('Hide post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to hide post. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feed/preferences/hide
 * Unhide a post - removes postId from user's hiddenPosts array
 * 
 * Authentication: Required via x-user-phone header
 * 
 * Query params:
 *   - postId: ID of the post to unhide (required)
 * 
 * Returns: Success status with updated hidden posts count
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user from headers
    const authPhone = request.headers.get('x-user-phone');

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    // Validate postId
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone }).select('_id').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    const postObjectId = new mongoose.Types.ObjectId(postId);

    // Remove post from hidden posts
    const updatedPreferences = await UserFeedPreference.findOneAndUpdate(
      { userId: user._id },
      {
        $pull: { hiddenPosts: postObjectId },
      },
      {
        new: true,
      }
    ).select('hiddenPosts').lean();

    if (!updatedPreferences) {
      return NextResponse.json(
        { success: false, error: 'Preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Post unhidden successfully',
      data: {
        postId,
        hiddenPostsCount: (updatedPreferences.hiddenPosts || []).length,
      },
    });

  } catch (error) {
    console.error('Unhide post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unhide post. Please try again.' },
      { status: 500 }
    );
  }
}
