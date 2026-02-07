import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

/**
 * POST /api/posts/[id]/save
 * Toggle save/bookmark status for a post
 * If post is saved, unsave it. If not saved, save it.
 * 
 * Response:
 * {
 *   success: boolean,
 *   isSaved: boolean,
 *   message: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    // Get user phone from header (authentication)
    const userPhone = request.headers.get('x-user-phone');
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Phone number required' },
        { status: 401 }
      );
    }

    // Validate post ID
    if (!postId || postId.length !== 24) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user by phone
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Initialize savedPosts if not exists
    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    // Check if post is already saved
    const savedIndex = user.savedPosts.findIndex(
      (savedPostId) => savedPostId.toString() === postId
    );

    let isSaved: boolean;
    let message: string;

    if (savedIndex > -1) {
      // Post is saved, remove it
      user.savedPosts.splice(savedIndex, 1);
      isSaved = false;
      message = 'Post removed from saved';
    } else {
      // Post is not saved, add it
      user.savedPosts.push(post._id);
      isSaved = true;
      message = 'Post saved successfully';
    }

    // Save user with updated savedPosts
    await user.save();

    return NextResponse.json({
      success: true,
      isSaved,
      message,
    });
  } catch (error) {
    console.error('Error toggling save status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle save status' },
      { status: 500 }
    );
  }
}
