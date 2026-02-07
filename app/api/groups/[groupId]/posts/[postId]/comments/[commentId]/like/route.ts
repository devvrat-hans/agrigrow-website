import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Group from '@/models/Group';
import GroupMembership from '@/models/GroupMembership';
import GroupPost from '@/models/GroupPost';
import GroupComment from '@/models/GroupComment';
import User from '@/models/User';
import Notification from '@/models/Notification';

/**
 * POST /api/groups/[groupId]/posts/[postId]/comments/[commentId]/like
 * Toggle like on a comment
 * - Check user is active group member
 * - If liked: remove from likes array, decrement likesCount
 * - If not liked: add to likes array, increment likesCount, create notification for comment author
 * - Returns { isLiked: boolean, likesCount: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; postId: string; commentId: string }> }
) {
  try {
    await connectDB();

    const { groupId, postId, commentId } = await params;
    const userPhone = request.headers.get('x-user-phone');

    // Authentication required
    if (!userPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the user
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate IDs
    if (!Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment ID' },
        { status: 400 }
      );
    }

    // Find the group by ID or slug
    let group;
    if (Types.ObjectId.isValid(groupId)) {
      group = await Group.findOne({
        _id: groupId,
        isActive: true,
      });
    }

    if (!group) {
      group = await Group.findOne({
        slug: groupId,
        isActive: true,
      });
    }

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if user is an active member
    const membership = await GroupMembership.findOne({
      groupId: group._id,
      userId: user._id,
      status: 'active',
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'You are not an active member of this group' },
        { status: 403 }
      );
    }

    // Find the post
    const post = await GroupPost.findOne({
      _id: postId,
      groupId: group._id,
      isDeleted: false,
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Find the comment
    const comment = await GroupComment.findOne({
      _id: commentId,
      postId: post._id,
      groupId: group._id,
      isDeleted: false,
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user already liked the comment
    const userObjectId = new Types.ObjectId(user._id);
    const alreadyLiked = comment.likes.some(
      (likeId: Types.ObjectId) => likeId.toString() === user._id.toString()
    );

    let isLiked: boolean;
    let likesCount: number;

    if (alreadyLiked) {
      // Unlike the comment
      await GroupComment.updateOne(
        { _id: comment._id },
        {
          $pull: { likes: userObjectId },
          $inc: { likesCount: -1 },
        }
      );

      isLiked = false;
      likesCount = Math.max(0, comment.likesCount - 1);
    } else {
      // Like the comment
      await GroupComment.updateOne(
        { _id: comment._id },
        {
          $addToSet: { likes: userObjectId },
          $inc: { likesCount: 1 },
        }
      );

      isLiked = true;
      likesCount = comment.likesCount + 1;

      // Create notification for comment author (unless liking own comment)
      if (comment.author.toString() !== user._id.toString()) {
        try {
          await Notification.create({
            userId: comment.author,
            type: 'like',
            fromUser: user._id,
            postId: post._id,
            commentId: comment._id,
            message: `${user.fullName || 'Someone'} liked your comment in "${group.name}"`,
            metadata: {
              groupId: group._id.toString(),
              groupName: group.name,
              groupSlug: group.slug,
              groupPostId: post._id.toString(),
              groupCommentId: comment._id.toString(),
              commentContent: comment.content.substring(0, 100),
              likerName: user.fullName || 'Unknown User',
              likerImage: user.profileImage,
            },
            isRead: false,
          });
        } catch (notificationError) {
          console.error('Failed to create like notification:', notificationError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isLiked,
        likesCount,
      },
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to toggle like',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
