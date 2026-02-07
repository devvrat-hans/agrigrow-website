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
 * POST /api/posts/[id]/comments/[commentId]/like
 * Toggles like on a comment
 * 
 * Authentication: Required via x-user-phone header or phone in body (legacy)
 * 
 * Body:
 *   - phone: Legacy - User's phone number (prefer x-user-phone header)
 * 
 * Actions:
 *   - Toggle like on the comment
 *   - Update likesCount
 *   - Create Notification for comment author (on like only)
 * 
 * Returns: { isLiked, likesCount }
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

    // Check if post exists
    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
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

    // Check if user already liked the comment
    const hasLiked = comment.likes?.some((likeId: mongoose.Types.ObjectId) => 
      likeId.toString() === user._id.toString()
    ) || false;

    let newLikesCount: number;
    const postObjectId = new mongoose.Types.ObjectId(id);
    const commentObjectId = new mongoose.Types.ObjectId(commentId);

    if (hasLiked) {
      // Unlike the comment using atomic operation
      await Comment.findByIdAndUpdate(commentId, {
        $pull: { likes: user._id },
        $inc: { likesCount: -1 },
      });
      newLikesCount = Math.max(0, (comment.likesCount || 0) - 1);
    } else {
      // Like the comment using atomic operation
      await Comment.findByIdAndUpdate(commentId, {
        $addToSet: { likes: user._id },
        $inc: { likesCount: 1 },
      });
      newLikesCount = (comment.likesCount || 0) + 1;

      // Create notification for comment author (only on like, not unlike)
      // Don't notify if user is liking their own comment
      if (comment.author.toString() !== user._id.toString()) {
        // Check if a similar notification already exists within the last hour
        const existingNotification = await Notification.findOne({
          userId: comment.author,
          type: 'like',
          fromUser: user._id,
          commentId: commentObjectId,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        });

        if (!existingNotification) {
          const notification = new Notification({
            userId: comment.author,
            type: 'like',
            fromUser: user._id,
            postId: postObjectId,
            commentId: commentObjectId,
            message: `${user.fullName} liked your comment`,
            metadata: {
              commentExcerpt: comment.content.substring(0, 100),
              postType: post.postType,
            },
            isRead: false,
            isClicked: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          });
          await notification.save();
        }
      }
    }

    return NextResponse.json({
      success: true,
      liked: !hasLiked,
      likesCount: newLikesCount,
    });

  } catch (error) {
    console.error('Like comment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to like/unlike comment. Please try again.' },
      { status: 500 }
    );
  }
}
