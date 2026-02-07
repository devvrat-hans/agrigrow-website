import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import User from '@/models/User';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * POST /api/posts/[id]/comments/[commentId]/helpful
 * Toggles helpful status on a comment (only by post author)
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - User's phone number (prefer x-user-phone header)
 * 
 * Constraints:
 *   - Only the post author can mark comments as helpful
 * 
 * Actions:
 *   - Toggle isHelpful boolean on the comment
 *   - Update post's helpfulMarksCount
 *   - Create Notification for comment author when marked helpful
 * 
 * Returns: Updated comment with isHelpful status
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, commentId } = await params;
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    
    // Get authenticated user from headers or body (legacy)
    const authPhone = request.headers.get('x-user-phone') || body.phone;

    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found. Please complete registration first.' },
        { status: 404 }
      );
    }

    // Get the post
    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify user is the post author
    if (post.author.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Only the post author can mark comments as helpful' },
        { status: 403 }
      );
    }

    // Find the comment
    const comment = await Comment.findOne({
      _id: commentId,
      post: id,
      isDeleted: false,
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const wasHelpful = comment.isHelpful || false;
    const newHelpfulStatus = !wasHelpful;
    const postObjectId = new mongoose.Types.ObjectId(id);
    const commentObjectId = new mongoose.Types.ObjectId(commentId);

    // Toggle helpful status
    await Comment.findByIdAndUpdate(commentId, {
      $set: { isHelpful: newHelpfulStatus }
    });

    // Update post's helpfulMarksCount
    await Post.findByIdAndUpdate(id, {
      $inc: { helpfulMarksCount: newHelpfulStatus ? 1 : -1 }
    });

    // Create notification when marking as helpful (not when removing)
    if (newHelpfulStatus && comment.author.toString() !== user._id.toString()) {
      const notification = new Notification({
        userId: comment.author,
        type: 'helpful',
        fromUser: user._id,
        postId: postObjectId,
        commentId: commentObjectId,
        message: `${user.fullName} marked your comment as helpful`,
        metadata: {
          commentExcerpt: comment.content.substring(0, 100),
          postExcerpt: post.content.substring(0, 100),
          postType: post.postType,
        },
        isRead: false,
        isClicked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      await notification.save();
    }

    // Get comment author details
    const commentAuthor = await User.findById(comment.author)
      .select('fullName role profileImage')
      .lean();

    return NextResponse.json({
      success: true,
      message: newHelpfulStatus 
        ? 'Comment marked as helpful' 
        : 'Comment unmarked as helpful',
      data: {
        _id: comment._id.toString(),
        content: comment.content,
        likesCount: comment.likesCount || 0,
        repliesCount: comment.repliesCount || 0,
        isHelpful: newHelpfulStatus,
        isEdited: comment.isEdited || false,
        createdAt: comment.createdAt,
        updatedAt: new Date(),
        author: commentAuthor ? {
          _id: commentAuthor._id.toString(),
          fullName: commentAuthor.fullName,
          role: commentAuthor.role,
          profileImage: commentAuthor.profileImage,
        } : {
          _id: '',
          fullName: 'Unknown User',
          role: 'farmer',
          profileImage: null,
        },
      },
    });

  } catch (error) {
    console.error('Mark comment helpful error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update comment. Please try again.' },
      { status: 500 }
    );
  }
}
